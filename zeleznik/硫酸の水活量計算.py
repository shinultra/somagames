import numpy as np
import pandas as pd

def create_correct_sulfuric_acid_table():
    OUTPUT_FILE = "SulfuricAcid_Corrected_Activity.csv"
    
    # 物理定数 (L-atm単位系)
    R_Latm = 0.082057338 
    M_H2SO4 = 98.079
    M_H2O = 18.015

    # ==========================================
    # 正確な係数セット (L-atm/mol)
    # ==========================================
    coeffs = {
        ('mu', 1, 1, 1): [23.5245033870, -1.18330789360, -1.51369362907e-5, 2961.44445015, 0.492476973663],
        ('mu', 1, 2, 1): [1114.58541077, -0.0116246143257, -0.00209946114412, -246749.842271, 34.1234558134],
        ('mu', 2, 2, 1): [-80.1488100747, 0.0406889449841, 6.06767928954e-6, 3092.72150882, 12.7601667471],
        
        ('eps', 1, 1, 1): [2887.31663295, -3.32602457749, -0.00282047283300, -528216.112353, 0.686997435643],
        ('eps', 1, 2, 1): [-370.944593249, -0.690310834523, 5.63455068422e-4, -3822.52997064, 94.2682037574],
        ('eps', 2, 1, 1): [38.3025318809, -0.0295997878789, 1.20999746782e-5, -3246.97498999, -3.83566039532],
        ('eps', 2, 2, 1): [2324.76399402, -0.141626921317, -0.00626760562881, -0.450590687961, -61.2339472744],
        
        ('eps', 1, 2, 2): [888.711613784, -2.50531359687, 6.05638824061e-4, -196983.296431, 74.5500643380],
        
        # eps 212 (sum of two blocks)
        ('eps', 2, 1, 2, 'a'): [-1633.85547832, -3.35344369968, 0.00710978119903, 0.198200003569, 246.693619189], 
        ('eps', 2, 1, 2, 'b'): [1273.75159848, 1.03333898148, 0.00341400487633, 195290.667051, -431.737442782]
    }

    def calc_param(c, T):
        return c[0] + c[1]*T + c[2]*(T**2) + c[3]/T + c[4]*np.log(T)

    def get_Y_Latm(x1_in, T_K):
        x1 = np.atleast_1d(x1_in)
        x2 = 1.0 - x1
        
        # Coeff calc
        mu = {}
        eps = {}
        mu[(1,1,1)] = calc_param(coeffs[('mu', 1, 1, 1)], T_K)
        mu[(1,2,1)] = calc_param(coeffs[('mu', 1, 2, 1)], T_K)
        mu[(2,2,1)] = calc_param(coeffs[('mu', 2, 2, 1)], T_K)
        
        eps[(1,1,1)] = calc_param(coeffs[('eps', 1, 1, 1)], T_K)
        eps[(1,2,1)] = calc_param(coeffs[('eps', 1, 2, 1)], T_K)
        eps[(2,1,1)] = calc_param(coeffs[('eps', 2, 1, 1)], T_K)
        eps[(2,2,1)] = calc_param(coeffs[('eps', 2, 2, 1)], T_K)
        eps[(1,2,2)] = calc_param(coeffs[('eps', 1, 2, 2)], T_K)
        eps[(2,1,2)] = calc_param(coeffs[('eps', 2, 1, 2, 'a')], T_K) + \
                       calc_param(coeffs[('eps', 2, 1, 2, 'b')], T_K)

        with np.errstate(divide='ignore', invalid='ignore'):
            ln_x1 = np.where(x1 > 0, np.log(x1), 0.0)
            ln_x2 = np.where(x2 > 0, np.log(x2), 0.0)

        # Term 1 (i=1)
        term1 = (mu[(1,1,1)] + eps[(1,1,1)] * ln_x1) * x1**2
        term1 += 2 * (mu[(1,2,1)] + eps[(1,2,1)] * ln_x1) * x1 * x2
        term1 += (mu[(1,2,1)] + eps[(2,1,1)] * ln_x2) * x2 * x1
        term1 += (mu[(2,2,1)] + eps[(2,2,1)] * ln_x2) * x2**2
        
        # Term 2 (i=2)
        term2 = (eps[(1,2,2)] * ln_x1) * (x1 * x2 * x1) + \
                (eps[(2,1,2)] * ln_x2) * (x1 * x2 * x2) # Phi(2)=x1*x2 multiplied by x1 or x2 inside sum?
        # Re-check Eq. 12 carefully:
        # Y = Phi(1)*Sum... + Phi(2)*Sum...
        # Phi(2) = x1*x2. Inside Sum is sum(eps * xj * xk)
        # So term2 = x1*x2 * [ (eps122 ln x1)*x1*x2 + (eps212 ln x2)*x2*x1 ]
        # Wait, indices j,k.
        # j=1,k=2 (eps122): xj=x1, xk=x2 -> term = (eps122 ln x1) * x1 * x2
        # j=2,k=1 (eps212): xj=x2, xk=x1 -> term = (eps212 ln x2) * x2 * x1
        # So total Term 2 is: x1*x2 * [ eps122*lnx1*x1*x2 + eps212*lnx2*x2*x1 ]
        
        term2_inner = (eps[(1,2,2)] * ln_x1) * x1 * x2 + \
                      (eps[(2,1,2)] * ln_x2) * x2 * x1
        
        return term1 + (x1 * x2) * term2_inner

    # Main Loop
    temps = np.arange(0, 75.1, 0.1)
    concs = np.arange(50.0, 100.0, 0.1)
    
    # Pre-calc concentrations
    n1 = concs / M_H2SO4
    n2 = (100.0 - concs) / M_H2O
    x1_arr = n1 / (n1 + n2)
    
    results = []
    print("計算中...")
    
    for T_C in temps:
        T_K = T_C + 273.15
        RT = R_Latm * T_K
        
        # Offset
        Y_offset = get_Y_Latm(0.0, T_K)[0]
        
        h = 1e-6
        x1_plus = np.clip(x1_arr + h, 0, 1)
        x1_minus = np.clip(x1_arr - h, 0, 1)
        
        Y = get_Y_Latm(x1_arr, T_K)
        Y_p = get_Y_Latm(x1_plus, T_K)
        Y_m = get_Y_Latm(x1_minus, T_K)
        dYdx = (Y_p - Y_m) / (x1_plus - x1_minus)
        
        # μ2(r) = Y - x1 * dY/dx
        mu2 = Y - x1_arr * dYdx - Y_offset
        
        # -μ/RT
        minus_mu_RT = - mu2 / RT
        
        # Activity
        aw = np.exp(-minus_mu_RT)
        
        rows = np.column_stack((
            np.full_like(concs, T_C),
            concs,
            x1_arr,
            minus_mu_RT,
            aw
        ))
        results.append(rows)
        
    final_data = np.vstack(results)
    df = pd.DataFrame(final_data, columns=["Temperature_C", "Concentration_wt%", "MoleFraction_H2SO4", "Minus_mu2_r_over_RT", "Water_Activity"])
    df.to_csv(OUTPUT_FILE, index=False)
    print("完了")

if __name__ == "__main__":
    create_correct_sulfuric_acid_table()