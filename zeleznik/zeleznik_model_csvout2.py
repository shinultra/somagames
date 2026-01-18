"""
CSV output script for Zeleznik Model V2
Generates -mu2(r)/RT for:
  - Temperature: -20°C to 75°C (0.1°C steps)
  - Concentration: 50 to 99.9 wt% H2SO4 (0.1% steps)
"""

import csv
import math
from zeleznik.zeleznik_model2 import ZeleznikModel2

def wt_to_mole_fraction(wt_h2so4):
    """
    Convert weight percent H2SO4 to mole fraction x1.
    M_H2SO4 = 98.079
    M_H2O = 18.01528
    """
    m1 = 98.079
    m2 = 18.01528
    
    w1 = wt_h2so4
    w2 = 100.0 - w1
    
    n1 = w1 / m1
    n2 = w2 / m2
    
    if n1 + n2 == 0:
        return 0.0
        
    return n1 / (n1 + n2)

def generate_csv():
    model = ZeleznikModel2()
    
    # Ranges
    # Temp: -20C to 75C, step 0.1
    # Wt%: 50 to 99.9, step 0.1
    
    t_start, t_end = -20.0, 75.0
    w_start, w_end = 50.0, 99.9
    
    t_step = 0.1
    w_step = 0.1
    
    output_file = 'result_zeleznik_matrix2.csv'
    
    print(f"Generating data to {output_file}...")
    print(f"Temp range: {t_start} to {t_end} C")
    print(f"Wt% range: {w_start} to {w_end} wt%")
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Temperature_C', 'Temperature_K', 'Wt_H2SO4', 'MoleFraction_H2SO4', 'Minus_Mu2_r_over_RT'])
        
        # Use integer loops to avoid floating point accumulation errors
        n_t_steps = int(round((t_end - t_start) / t_step))
        n_w_steps = int(round((w_end - w_start) / w_step))
        
        # Total iterations for progress
        total = (n_t_steps + 1) * (n_w_steps + 1)
        count = 0
        
        for i in range(n_t_steps + 1):
            t_c = t_start + i * t_step
            t_k = t_c + 273.15
            
            for j in range(n_w_steps + 1):
                wt = w_start + j * w_step
                x1 = wt_to_mole_fraction(wt)
                
                val = model.calc_minus_mu2_r_over_RT(x1, t_k)
                
                writer.writerow([f"{t_c:.1f}", f"{t_k:.2f}", f"{wt:.1f}", f"{x1:.6f}", f"{val:.6f}"])
                
                count += 1
                if count % 10000 == 0:
                    print(f"Processed {count}/{total} points... ({count/total*100:.1f}%)")

    print(f"Done. File saved to {output_file}")

if __name__ == "__main__":
    generate_csv()
