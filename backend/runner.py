import sys
import os
import json
import io
import time
import base64
import traceback
import math

def serialize_val(val):
    if val is None:
        return None
    try:
        import numpy as np
        if isinstance(val, (np.integer, np.int64, np.int32)):
            return int(val)
        if isinstance(val, (np.floating, np.float64, np.float32)):
            if np.isnan(val) or np.isinf(val):
                return str(val)
            return float(val)
        if isinstance(val, np.ndarray):
            return val.tolist()
    except Exception:
        pass
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return str(val)
    if hasattr(val, 'isoformat'):
        return val.isoformat()
    return str(val) if not isinstance(val, (int, str, bool, list, dict)) else val

def df_to_table_dict(df, max_rows=10):
    try:
        import pandas as pd
        if not isinstance(df, (pd.DataFrame, pd.Series)):
            return None
        if isinstance(df, pd.Series):
            df = df.to_frame()
        
        cols = [str(c) for c in df.columns]
        rows_data = []
        for _, row in df.head(max_rows).iterrows():
            rows_data.append([serialize_val(x) for x in row.values])
        
        return {
            "columns": cols,
            "rows": rows_data,
            "total_rows": len(df),
            "total_cols": len(df.columns)
        }
    except Exception:
        return None

def run_code(code_str, work_dir=None):
    if work_dir and os.path.exists(work_dir):
        os.chdir(work_dir)
        if work_dir not in sys.path:
            sys.path.insert(0, work_dir)

    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except Exception:
        plt = None

    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr

    images = []
    start_time = time.time()
    success = True
    error_msg = ""
    table_before = None
    table_after = None

    exec_globals = {
        '__name__': '__main__',
        '__doc__': None,
    }

    try:
        sys.stdout = stdout_capture
        sys.stderr = stderr_capture

        code_wrapper = """import os, sys
import numpy as np
import pandas as pd
pd.set_option('display.max_columns', 50)
pd.set_option('display.width', 1000)
pd.set_option('display.max_rows', 100)
try:
    import matplotlib.pyplot as plt
    import seaborn as sns
except Exception:
    pass
""" + "\n" + code_str

        exec(code_wrapper, exec_globals)

        # Capture Before/After DataFrames if present
        if 'df' in exec_globals:
            table_before = df_to_table_dict(exec_globals['df'])
        if 'res' in exec_globals:
            table_after = df_to_table_dict(exec_globals['res'])
        elif 'df_res' in exec_globals:
            table_after = df_to_table_dict(exec_globals['df_res'])
        elif 'result' in exec_globals:
            table_after = df_to_table_dict(exec_globals['result'])

        # Capture plots
        if plt:
            fig_nums = plt.get_fignums()
            for fnum in fig_nums:
                fig = plt.figure(fnum)
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                buf.seek(0)
                b64_img = base64.b64encode(buf.read()).decode('utf-8')
                images.append(f"data:image/png;base64,{b64_img}")
                buf.close()
            plt.close('all')

    except Exception:
        success = False
        error_msg = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    elapsed = round((time.time() - start_time) * 1000, 2)
    stdout_text = stdout_capture.getvalue()
    stderr_text = stderr_capture.getvalue()
    if error_msg:
        stderr_text = (stderr_text + "\n" + error_msg).strip()

    return {
        "success": success,
        "stdout": stdout_text,
        "stderr": stderr_text,
        "images": images,
        "elapsed_ms": elapsed,
        "table_before": table_before,
        "table_after": table_after
    }

if __name__ == '__main__':
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"success": False, "stdout": "", "stderr": "No input code provided.", "images": []}))
            sys.exit(0)

        payload = json.loads(raw_input)
        code = payload.get('code', '')
        work_dir = payload.get('work_dir', os.getcwd())

        res = run_code(code, work_dir)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "stdout": "",
            "stderr": f"Runner Error: {str(e)}",
            "images": [],
            "elapsed_ms": 0
        }))
