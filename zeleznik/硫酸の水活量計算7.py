import numpy as np
import pandas as pd
import math

# =============================================================================
# Zeleznik (1991) Model for Aqueous Sulfuric Acid
# Based on J. Phys. Chem. Ref. Data, Vol 20, No. 6, 1991
# =============================================================================

class ZeleznikModel:
    def __init__(self):
        self.R = 8.314462618  # J/(mol K)

        # Coefficients from Table 6
        # Basis order: [1, T, T^2, 1/T, ln(T)]
        # Indices in keys are 'jki' (j, k, i).
        # Note: Parameters satisfy symmetry mu_jki = mu_kji (symmetric in j,k).
        # The table lists distinct parameters. We must populate symmetric ones if needed,
        # but the summation logic handles j,k loops.
        
        self.mu_coeffs_db = {
            '111': [-0.235245033870E+02, 0.406889449841E-01, -0.151369362907E-04, 0.296144445015E+04, 0.492476973663E+00],
            '121': [0.111458541077E+04, -0.118330789360E+01, -0.209946114412E-02, -0.246749842271E+06, 0.341234558134E+02],
            '221': [-0.801488100747E+02, -0.116246143257E-01, 0.606767928954E-05, 0.309272150882E+04, 0.127601667471E+02],
            '122': [0.888711613784E+03, -0.250531359687E+01, 0.605638824061E-03, -0.196983296431E+06, 0.745500643380E+02]
        }
        # Add symmetric keys for mu (mu_jki = mu_kji)
        self.mu_coeffs_db['211'] = self.mu_coeffs_db['121']
        self.mu_coeffs_db['212'] = self.mu_coeffs_db['122']
        # Note: 112 and 222 are not in Table 6, assumed 0.0

        self.eps_coeffs_db = {
            '111': [0.288731663295E+04, -0.332602457749E+01, -0.282047283300E-02, -0.528216112353E+06, 0.686997435643E+00],
            '121': [-0.370944593249E+03, -0.690310834523E+00, 0.563455068422E-03, -0.382252997064E+04, 0.942682037574E+02],
            '211': [0.383025318809E+02, -0.295997878789E-01, 0.120999746782E-04, -0.324697498999E+04, -0.383566039532E+01],
            '221': [0.232476399402E+04, -0.141626921317E+00, -0.626760562881E-02, -0.430390687961E+06, -0.612339472744E+02],
            '122': [-0.163385547832E+04, -0.335344369968E+01, 0.710978119903E-02, 0.198200003569E+06, 0.246693619189E+03],
            '212': [0.127375159848E+04, 0.103333898148E+01, 0.341400487633E-02, 0.195290667051E+06, -0.431737442782E+03]
        }
        # Note: 112 and 222 are not in Table 6, assumed 0.0

    def _get_param_val(self, db, j, k, i, T):
        """Calculate parameter value at T for indices j,k,i"""
        key = f"{j}{k}{i}"
        if key not in db:
            return 0.0
        
        c = db[key]
        # Basis: 1, T, T^2, 1/T, ln(T)
        val = (c[0] + 
               c[1] * T + 
               c[2] * T**2 + 
               c[3] / T + 
               c[4] * np.log(T))
        return val

    def calc_Q(self, x1, T):
        """
        Calculates Q = -G^(r)/RT
        Q = Sum_i Phi(i) * S_i
        S_i = Sum_j Sum_k (mu_jki + eps_jki * ln(x_j)) * x_j * x_k
        
        x1: mole fraction H2SO4
        x2: mole fraction H2O = 1 - x1
        Species 1 = H2SO4, Species 2 = H2O
        Phi(1) = 1, Phi(2) = x1/x2
        """
        x = {1: x1, 2: 1.0 - x1}
        
        # Avoid log(0)
        ln_x = {}
        for idx in [1, 2]:
            ln_x[idx] = np.log(x[idx]) if x[idx] > 0 else -1e9 # Should be handled by x_j -> 0 limit logic usually
            
        # Determine Phi values
        # Phi(1) = 1
        # Phi(2) = x1/x2
        phi = {1: 1.0, 2: x[1]/x[2] if x[2] > 0 else 0.0} 

        Q_total = 0.0
        
        for i in [1, 2]:
            S_i = 0.0
            for j in [1, 2]:
                for k in [1, 2]:
                    mu_val = self._get_param_val(self.mu_coeffs_db, j, k, i, T)
                    eps_val = self._get_param_val(self.eps_coeffs_db, j, k, i, T)
                    
                    term = (mu_val + eps_val * ln_x[j]) * x[j] * x[k]
                    S_i += term
            
            Q_total += phi[i] * S_i
            
        return Q_total

    def calc_minus_mu2_r_over_RT(self, x1, T):
        """
        Calculates -mu_2^(r)/RT
        Using the relation: mu_2/RT = -Q + x1 * (dQ/dx1)
        Therefore: -mu_2/RT = Q - x1 * (dQ/dx1)
        """
        # We calculate derivative numerically for simplicity and robustness 
        # (Given the complexity of Phi(2) and ln(x) terms, analytical is error-prone)
        # However, at x1 close to 0 or 1, we must be careful.
        
        h = 1e-6
        # Central difference
        if x1 < h:
            x1_plus = x1 + h
            x1_minus = x1
            denom = h
        elif x1 > 1.0 - h:
            x1_plus = x1
            x1_minus = x1 - h
            denom = h
        else:
            x1_plus = x1 + h
            x1_minus = x1 - h
            denom = 2*h
            
        Q_plus = self.calc_Q(x1_plus, T)
        Q_minus = self.calc_Q(x1_minus, T)
        dQ_dx1 = (Q_plus - Q_minus) / denom
        
        Q_val = self.calc_Q(x1, T)
        
        # Formula: mu2/RT = G/RT - x1 * d(G/RT)/dx1
        # G/RT = -Q
        # mu2/RT = -Q - x1 * d(-Q)/dx1 = -Q + x1 * dQ/dx1
        # Target is -mu2/RT
        # -mu2/RT = Q - x1 * dQ/dx1
        
        val = Q_val - x1 * dQ_dx1
        return val

# =============================================================================
# Verification against Table 7 (T=298.15 K)
# =============================================================================
def verify_table_7():
    model = ZeleznikModel()
    T = 298.15
    
    # Data from Table 7 in J. Phys. Chem. Ref. Data, Vol 20, No. 6, 1991
    # x(H2SO4)  Target -mu2(r)/RT
    verification_points = [
        (0.1000, 0.4931),
        (0.2000, 1.8458), # Approx from chart visually or OCR line
        (0.5000, 6.8584),
        (0.8000, 10.9522),
        (0.9000, 12.2345)
    ]
    
    print(f"--- Verification at T = {T} K ---")
    print(f"{'x(H2SO4)':<10} {'Calculated':<12} {'Table 7 Ref':<12} {'Diff':<10}")
    
    for x1, ref_val in verification_points:
        try:
            calc_val = model.calc_minus_mu2_r_over_RT(x1, T)
            print(f"{x1:<10.4f} {calc_val:<12.4f} {ref_val:<12.4f} {calc_val-ref_val:<10.4f}")
        except Exception as e:
            print(f"{x1:<10.4f} Error: {e}")

# =============================================================================
# Main Execution
# =============================================================================
if __name__ == "__main__":
    verify_table_7()
    
    # Example Usage for User
    print("\n--- User Calculation Example ---")
    model = ZeleznikModel()
    t_user = 298.15
    concs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    print(f"Temperature: {t_user} K")
    print("x(H2SO4), -mu2(r)/RT")
    for x in concs:
        val = model.calc_minus_mu2_r_over_RT(x, t_user)
        print(f"{x:.2f}, {val:.4f}")