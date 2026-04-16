"""
backend/main.py — FastAPI entry point

"""

import io
import os
import json
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv(override=True)

from backend.openai_client import init_openai_client
from backend.preprocessing import parse_resume_with_openai
from backend.resume_analysis import ResumeAnalyzer
from backend.resume_formatter import extract_detailed_resume_data, generate_resume_docx
from backend.ppt_generator import generate_candidate_ppt
from backend.ppt_template_mapper import map_to_template_format
from backend.file_handlers import extract_text_from_file
from backend.sharepoint import (
    SharePointUploader,
    download_from_sharepoint,
    upload_to_sharepoint,
    save_csv_to_sharepoint,
    list_jds_from_sharepoint,
    upload_jd_to_sharepoint,
    download_jd_from_sharepoint,
    delete_jd_from_sharepoint,
)

app = FastAPI(title="NexTurn Resume Screening API", version="1.0.0")

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise OpenAI client once
_client = None

def get_client():
    global _client
    if _client is None:
        _client = init_openai_client()
    return _client

def _sp_config():
    return {
        "tenant_id":          os.getenv("TENANT_ID", ""),
        "client_id":          os.getenv("CLIENT_ID", ""),
        "client_secret":      os.getenv("CLIENT_SECRET", ""),
        "site_id":            os.getenv("SHAREPOINT_SITE_ID", ""),
        "drive_id":           os.getenv("SHAREPOINT_DRIVE_ID", ""),
        "input_folder_path":  os.getenv("INPUT_FOLDER_PATH", "Demair/Sample resumes"),
        "output_folder_path": os.getenv("OUTPUT_FOLDER_PATH", "Demair/Resumes_database"),
        "jd_folder_path":     os.getenv("JD_FOLDER_PATH", "Demair/Job_Descriptions"),
        "connected":          True,
    }


# Health 

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
@app.get("/")
def root():
    return {
        "message": "NexTurn Resume Screening API is running 🚀",
        "docs": "/docs",
        "health": "/api/health"
    }


# SharePoint status

@app.get("/api/sharepoint/status")
def sharepoint_status():
    cfg = _sp_config()
    required = [cfg["tenant_id"], cfg["client_id"], cfg["client_secret"],
                cfg["site_id"], cfg["drive_id"]]
    if not all(required):
        return {"connected": False, "reason": "Missing credentials in .env"}
    try:
        import msal
        authority = f"https://login.microsoftonline.com/{cfg['tenant_id']}"
        msal_app = msal.ConfidentialClientApplication(
            cfg["client_id"], authority=authority,
            client_credential=cfg["client_secret"],
        )
        token = msal_app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )
        if "access_token" in token:
            return {"connected": True}
        return {"connected": False, "reason": token.get("error_description", "Auth failed")}
    except Exception as e:
        return {"connected": False, "reason": str(e)}


# Resume parsing 

@app.post("/api/parse-resumes")
async def parse_resumes(files: list[UploadFile] = File(...)):
    client = get_client()
    results = []
    errors = []

    for file in files:
        try:
            content = await file.read()
            file_like = io.BytesIO(content)
            file_like.name = file.filename

            # Use existing file_handlers extract function
            class _FakeSPFile:
                def __init__(self, name, data):
                    self.name = name
                    self.content = data

            sp_file = {"name": file.filename, "content": content}
            text = extract_text_from_file(sp_file)

            if not text:
                errors.append({"name": file.filename, "reason": "Could not extract text"})
                continue

            upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            parsed = parse_resume_with_openai(
                client, text, file.filename, mask_pii=True, upload_date=upload_date
            )
            if parsed:
                parsed["_resume_text"] = text  # carry text for downstream scoring
                results.append(parsed)
            else:
                errors.append({"name": file.filename, "reason": "AI parsing failed"})
        except Exception as e:
            errors.append({"name": file.filename, "reason": str(e)})

    return {"parsed": results, "errors": errors}


# SharePoint resume fetch 

@app.get("/api/sharepoint/resumes")
def get_sharepoint_resumes(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    cfg = _sp_config()
    client = get_client()

    try:
        downloaded = download_from_sharepoint(cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Date filter
    if start_date and end_date:
        sd = datetime.fromisoformat(start_date).date()
        ed = datetime.fromisoformat(end_date).date()
        filtered = []
        for f in downloaded:
            ts = f.get("timestamp", "")
            try:
                fdate = datetime.fromisoformat(str(ts).replace("Z", "+00:00")).date()
                if sd <= fdate <= ed:
                    filtered.append(f)
            except Exception:
                filtered.append(f)
        downloaded = filtered

    results = []
    errors = []
    for file_data in downloaded:
        try:
            text = extract_text_from_file(file_data)
            if not text:
                errors.append({"name": file_data["name"], "reason": "Could not extract text"})
                continue
            upload_date = file_data.get("timestamp", datetime.now().isoformat())
            if isinstance(upload_date, str):
                try:
                    upload_date = datetime.fromisoformat(
                        upload_date.replace("Z", "+00:00")
                    ).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            parsed = parse_resume_with_openai(
                client, text, file_data["name"], mask_pii=True, upload_date=upload_date
            )
            if parsed:
                parsed["_resume_text"] = text
                results.append(parsed)
            else:
                errors.append({"name": file_data["name"], "reason": "AI parsing failed"})
        except Exception as e:
            errors.append({"name": file_data["name"], "reason": str(e)})

    return {"parsed": results, "errors": errors, "total_files": len(downloaded)}


# AI screening / scoring

class ScoreRequest(BaseModel):
    candidates: list[dict]
    job_description: str

@app.post("/api/score-candidates")
def score_candidates(req: ScoreRequest):
    client = get_client()
    analyzer = ResumeAnalyzer(client)
    results = []

    for candidate in req.candidates:
        resume_text = candidate.get("_resume_text", str(candidate))

        # Quality analysis
        analysis = analyzer.analyze_resume(resume_text)
        for key in ["career_gaps", "technical_anomalies", "fake_indicators", "domain_knowledge"]:
            raw = analysis.get(key, [])
            if isinstance(raw, list):
                analysis[key] = [
                    str(item.get("description", item) if isinstance(item, dict) else item)
                    for item in raw
                ]
            else:
                analysis[key] = [str(raw)] if raw else []

        # Score
        score, breakdown, reason = _score_single(client, candidate, req.job_description)

        results.append({
            "metadata":    {k: v for k, v in candidate.items() if not k.startswith("_")},
            "analysis":    analysis,
            "final_score": score,
            "breakdown":   breakdown,
            "reason":      reason,
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)
    return {"results": results}


def _score_single(client, candidate_data: dict, job_desc: str):
    from backend.openai_client import create_openai_completion
    import json as _json
    
    # 1. Prepare candidate summary
    summary = (
        f"Name: {candidate_data.get('name', 'N/A')}\n"
        f"Experience: {candidate_data.get('experience_years', 'N/A')} years\n"
        f"Skills: {candidate_data.get('tech_stack', 'N/A')}\n"
        f"Current Role: {candidate_data.get('current_role', 'N/A')}\n"
        f"Education: {candidate_data.get('education', 'N/A')}\n"
        f"Projects: {str(candidate_data.get('key_projects', ''))[:400]}\n"
        f"Certifications: {candidate_data.get('certifications', 'None')}"
    )

    # 2. Updated Prompt (telling AI to just provide the raw data)
    prompt = (
        "You are an expert technical recruiter. Evaluate the candidate against the job description.\n\n"
        f"JOB DESCRIPTION:\n{job_desc[:2000]}\n\n"
        f"CANDIDATE:\n{summary}\n\n"
        "Return ONLY JSON: {\"skills_match\":<int>,\"experience_match\":<int>,"
        "\"projects_match\":<int>,\"domain_match\":<int>,\"reason\":\"<str>\"}"
    )

    try:
        resp = create_openai_completion(
            client,
            messages=[
                {"role": "system", "content": "You are a precise recruiter scoring assistant. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=150,
        )
        raw = resp.choices[0].message.content.strip()
        data = _json.loads(raw[raw.find("{"):raw.rfind("}") + 1])

        # 3. Capture the raw category scores
        bd = {
            "Skills Match":       max(0, min(100, int(data.get("skills_match", 0)))),
            "Experience Match":   max(0, min(100, int(data.get("experience_match", 0)))),
            "Projects Match":     max(0, min(100, int(data.get("projects_match", 0)))),
            "Domain & Education": max(0, min(100, int(data.get("domain_match", 0)))),
        }

        # 4. FORCE python to calculate the final score (The Fix)
        # We ignore 'overall' from the JSON and calculate it ourselves
        overall = round(
            (bd["Skills Match"] * 0.40) + 
            (bd["Experience Match"] * 0.30) + 
            (bd["Projects Match"] * 0.20) + 
            (bd["Domain & Education"] * 0.10)
        )

        return overall, bd, str(data.get("reason", ""))
    except Exception as e:
        print(f"Error in scoring: {e}")
        return 0, {}, ""


# Document generation 

class DocGenRequest(BaseModel):
    candidate: dict
    resume_text: str

@app.post("/api/generate-word")
def generate_word(req: DocGenRequest):
    client = get_client()
    detailed = extract_detailed_resume_data(client, req.resume_text, req.candidate)
    doc_bytes = generate_resume_docx(detailed)
    if not doc_bytes:
        raise HTTPException(status_code=500, detail="Word doc generation failed")
    name = req.candidate.get("name", "candidate").replace(" ", "_")
    return Response(
        content=doc_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{name}_resume.docx"'},
    )

@app.post("/api/generate-ppt")
def generate_ppt(req: DocGenRequest):
    client = get_client()
    detailed = extract_detailed_resume_data(client, req.resume_text, req.candidate)
    mapped = map_to_template_format(detailed)
    ppt_bytes = generate_candidate_ppt({**detailed, **mapped})
    if not ppt_bytes:
        raise HTTPException(status_code=500, detail="PPT generation failed")
    name = req.candidate.get("name", "candidate").replace(" ", "_")
    return Response(
        content=ppt_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{name}_profile.pptx"'},
    )


# SharePoint JD endpoints 

@app.get("/api/sharepoint/jds")
def list_jds():
    cfg = _sp_config()
    try:
        return {"jds": list_jds_from_sharepoint(cfg)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class JDUploadRequest(BaseModel):
    text: str
    filename: str

@app.post("/api/sharepoint/jds")
def upload_jd(req: JDUploadRequest):
    cfg = _sp_config()
    ok = upload_jd_to_sharepoint(cfg, req.text, req.filename)
    return {"success": ok}

class JDDownloadRequest(BaseModel):
    download_url: str
    file_type: str = "txt"

@app.post("/api/sharepoint/jds/download")
def download_jd(req: JDDownloadRequest):
    cfg = _sp_config()
    text = download_jd_from_sharepoint(req.download_url, req.file_type, cfg)
    return {"text": text}

@app.delete("/api/sharepoint/jds/{item_id}")
def delete_jd(item_id: str):
    cfg = _sp_config()
    ok = delete_jd_from_sharepoint(cfg, item_id)
    return {"success": ok}


# Candidate pool export to SharePoint 

class PoolExportRequest(BaseModel):
    candidates: list[dict]

@app.post("/api/sharepoint/export-pool")
def export_pool(req: PoolExportRequest):
    import pandas as pd
    cfg = _sp_config()
    df = pd.DataFrame(req.candidates)
    filename = f"candidate_pool_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    ok = save_csv_to_sharepoint(cfg, df, filename)
    return {"success": ok, "filename": filename}
