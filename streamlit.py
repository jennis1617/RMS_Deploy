# streamlit.py
# Shim so existing backend modules that do "import streamlit as st"
# work without Streamlit installed. All calls become no-ops.

def error(*a, **kw): pass
def warning(*a, **kw): pass
def success(*a, **kw): pass
def info(*a, **kw): pass
def write(*a, **kw): pass
def spinner(*a, **kw):
    class _CM:
        def __enter__(self): return self
        def __exit__(self, *a): pass
    return _CM()