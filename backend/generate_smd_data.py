import numpy as np
import pandas as pd
import os

np.random.seed(42)
n_rows = 5000

# 1. 공정 식별자
lot_ids = [f"LOT_{20260301 + (i // 500):08d}" for i in range(n_rows)]
board_ids = [f"PCB_{i+1:05d}" for i in range(n_rows)]
lines = np.random.choice(["SMD_Line_A", "SMD_Line_B", "SMD_Line_C"], size=n_rows, p=[0.4, 0.35, 0.25])
machines = np.random.choice(["Mounter_01", "Mounter_02", "Mounter_03", "Mounter_04"], size=n_rows)
feeders = np.random.choice([f"FD_{k:02d}" for k in range(1, 25)], size=n_rows)
nozzles = np.random.choice([f"NZ_{k:02d}" for k in range(1, 9)], size=n_rows)
component_types = np.random.choice(["CHIP_0603", "CHIP_1005", "IC_QFP_48", "BGA_256", "CAP_3216"], size=n_rows, p=[0.35, 0.3, 0.15, 0.1, 0.1])

# 2. 마운팅 위치 및 정밀도 수치 센서 (um, deg)
offset_x = np.random.normal(loc=0.0, scale=12.5, size=n_rows)
offset_y = np.random.normal(loc=0.0, scale=11.8, size=n_rows)
offset_angle = np.random.normal(loc=0.0, scale=0.45, size=n_rows)

solder_height = np.random.normal(loc=130.0, scale=15.0, size=n_rows)
solder_volume = np.random.normal(loc=100.0, scale=12.0, size=n_rows)

vacuum_pressure = np.random.normal(loc=-72.0, scale=3.5, size=n_rows)
placement_force = np.random.normal(loc=3.2, scale=0.6, size=n_rows)
reflow_temp_peak = np.random.normal(loc=245.0, scale=4.2, size=n_rows)
tact_time_sec = np.random.normal(loc=4.2, scale=0.5, size=n_rows)

# 3. 인위적 결측치(NaN) 주입
nan_mask_solder = np.random.rand(n_rows) < 0.08
solder_volume[nan_mask_solder] = np.nan

nan_mask_vac = np.random.rand(n_rows) < 0.05
vacuum_pressure[nan_mask_vac] = np.nan

# 4. 불량 판정 규칙
score = (
    (np.abs(offset_x) / 30.0) ** 2 +
    (np.abs(offset_y) / 30.0) ** 2 +
    (np.abs(offset_angle) / 1.2) ** 2 +
    (np.abs(np.nan_to_num(solder_volume, nan=100.0) - 100.0) / 25.0) ** 2 +
    (np.maximum(0, np.nan_to_num(vacuum_pressure, nan=-72.0) + 65.0) / 5.0)
)
prob_defect = 1.0 / (1.0 + np.exp(-(score - 3.2)))
is_defective = (np.random.rand(n_rows) < prob_defect).astype(int)

defect_types = []
for i in range(n_rows):
    if is_defective[i] == 0:
        defect_types.append("Normal")
    else:
        ox = abs(offset_x[i])
        oy = abs(offset_y[i])
        sv = 100.0 if np.isnan(solder_volume[i]) else solder_volume[i]
        vac = -72.0 if np.isnan(vacuum_pressure[i]) else vacuum_pressure[i]
        
        if sv > 130:
            defect_types.append("Solder_Bridge")
        elif sv < 70:
            defect_types.append("Insufficient_Solder")
        elif vac > -64:
            defect_types.append("Missing_Component")
        elif ox > 35 or oy > 35 or abs(offset_angle[i]) > 1.2:
            defect_types.append("Mount_Shift")
        else:
            defect_types.append("Tombstone")

grades = []
for i in range(n_rows):
    if is_defective[i] == 1:
        grades.append("F")
    else:
        sc = score[i]
        if sc < 1.0:
            grades.append("A")
        elif sc < 2.0:
            grades.append("B")
        else:
            grades.append("C")

df = pd.DataFrame({
    "PCB_ID": board_ids,
    "Lot_ID": lot_ids,
    "Line": lines,
    "Machine": machines,
    "Feeder_ID": feeders,
    "Nozzle_ID": nozzles,
    "Component": component_types,
    "Offset_X": np.round(offset_x, 2),
    "Offset_Y": np.round(offset_y, 2),
    "Offset_Angle": np.round(offset_angle, 3),
    "Solder_Height": np.round(solder_height, 2),
    "Solder_Volume": np.round(solder_volume, 2),
    "Vacuum_Pressure": np.round(vacuum_pressure, 2),
    "Placement_Force": np.round(placement_force, 2),
    "Reflow_Peak_Temp": np.round(reflow_temp_peak, 1),
    "Tact_Time": np.round(tact_time_sec, 2),
    "Grade": grades,
    "Defect_Type": defect_types,
    "Is_Defective": is_defective
})

out_dir = "/home/kw/kwsoft/data-designer/backend/data"
os.makedirs(out_dir, exist_ok=True)
csv_path = os.path.join(out_dir, "smd_process_log.csv")
df.to_csv(csv_path, index=False)
print(f"Generated {len(df)} rows, {df.shape[1]} columns -> {csv_path}")
print("Defect distribution:")
print(df["Defect_Type"].value_counts())
