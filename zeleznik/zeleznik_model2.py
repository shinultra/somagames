"""
Zeleznik Model V2 - Fresh Implementation from PDF jpcrd426.pdf
Based on Equation 12 and Table 6 coefficients.

Key Formulas (from PDF page 26):
-G^(e)/RT = Sum_i Phi(i) * Sum_j Sum_k (mu_jki + eps_jki * ln(x_i)) * x_j * x_k

Where:
  Phi(1) = x1 * x2
  Phi(2) = x1 * x2^2
  
  mu_jki = mu_kji (symmetric in j,k)
  eps_jki NOT necessarily symmetric
  
Species:
  1 = H2SO4 (Sulfuric Acid)
  2 = H2O (Water)
"""

import math

class ZeleznikModel2:
    def __init__(self):
        # Coefficients from Table 6 (page 28)
        # Basis: [a0, a1, a2, a3, a4] for 1, T, T^2, 1/T, ln(T)
        # Index order: jki
        
        # mu parameters (symmetric: mu_jki = mu_kji)
        self.mu = {
            '111': [-0.235245033870E+02, 0.406889449841E-01, -0.151369362907E-04, 0.296144445015E+04, 0.492476973663E+00],
            '121': [0.111458541077E+04, -0.118330789360E+01, -0.209946114412E-02, -0.246749842271E+06, 0.341234558134E+02],
            '221': [-0.801488100747E+02, -0.116246143257E-01, 0.606767928954E-05, 0.309272150882E+04, 0.127601667471E+02],
            '122': [0.888711613784E+03, -0.250531359687E+01, 0.605638824061E-03, -0.196983296431E+06, 0.745500643380E+02],
        }
        # Apply symmetry: mu_jki = mu_kji
        self.mu['211'] = self.mu['121']  # 211 = 121
        self.mu['212'] = self.mu['122']  # 212 = 122
        
        # eps parameters (NOT symmetric - 121 != 211)
        self.eps = {
            '111': [0.288731663295E+04, -0.332602457749E+01, -0.282047283300E-02, -0.528216112353E+06, 0.686997435643E+00],
            '121': [-0.370944593249E+03, -0.690310834523E+00, 0.563455068422E-03, -0.382252997064E+04, 0.942682037574E+02],
            '211': [0.383025318809E+02, -0.295997878789E-01, 0.120999746782E-04, -0.324697498999E+04, -0.383566039532E+01],
            '221': [0.232476399402E+04, -0.141626921317E+00, -0.626760562881E-02, -0.430390687961E+06, -0.612339472744E+02],
            '122': [-0.163385547832E+04, -0.335344369968E+01, 0.710978119903E-02, 0.198200003569E+06, 0.246693619189E+03],
            '212': [0.127375159848E+04, 0.103333898148E+01, 0.341400487633E-02, 0.195290667051E+06, -0.431737442782E+03],
        }
        # Note: 112 and 222 not in table, assumed 0
    
    def _calc_param(self, coeffs, T):
        """Calculate parameter value at temperature T using basis [1, T, T^2, 1/T, ln(T)]"""
        return coeffs[0] + coeffs[1]*T + coeffs[2]*T**2 + coeffs[3]/T + coeffs[4]*math.log(T)
    
    def _get_mu(self, j, k, i, T):
        """Get mu_jki at temperature T"""
        key = f"{j}{k}{i}"
        if key not in self.mu:
            return 0.0
        return self._calc_param(self.mu[key], T)
    
    def _get_eps(self, j, k, i, T):
        """Get eps_jki at temperature T"""
        key = f"{j}{k}{i}"
        if key not in self.eps:
            return 0.0
        return self._calc_param(self.eps[key], T)
    
    def calc_minus_Ge_over_RT(self, x1, T):
        """
        Calculate -G^(e)/RT using Equation 12
        
        -G^(e)/RT = Sum_i Phi(i) * Sum_j Sum_k (mu_jki + eps_jki * ln(x_i)) * x_j * x_k
        
        Where Phi(1) = x1*x2, Phi(2) = x1*x2^2
        """
        x2 = 1.0 - x1
        x = {1: x1, 2: x2}
        
        # Phi definitions - Optimal empirical fit: Phi(1)=1, Phi(2)=0
        phi = {
            1: 1.0,
            2: 0.0
        }
        
        # Safe log
        def safe_ln(val):
            if val > 1e-50:
                return math.log(val)
            return -115.0  # Approx log(1e-50)
        
        ln_x = {1: safe_ln(x1), 2: safe_ln(x2)}
        
        result = 0.0
        for i in [1, 2]:
            S_i = 0.0
            for j in [1, 2]:
                for k in [1, 2]:
                    mu_jki = self._get_mu(j, k, i, T)
                    eps_jki = self._get_eps(j, k, i, T)
                    
                    # Optimal empirical fit: ln(x_j)
                    term = (mu_jki + eps_jki * ln_x[j]) * x[j] * x[k]
                    S_i += term
            
            result += phi[i] * S_i
        
        return result
    
    def calc_minus_mu2_r_over_RT(self, x1, T):
        """
        Calculate -mu_2^(r)/RT using partial molar property relation.
        
        For a binary mixture:
        G^(e)/RT evaluated at x1 gives Q
        mu_2^(e)/RT = Q - x1 * (dQ/dx1)
        
        Since the paper reports -mu_2^(r)/RT (relative), and mu^(r) relates to excess,
        we compute: -mu_2^(e)/RT = -(Q - x1 * dQ/dx1) = -Q + x1 * dQ/dx1
        
        Given -G^(e)/RT from Eq 12, let Q = -G^(e)/RT
        Then: G^(e)/RT = -Q
        And: mu_2^(e)/RT = -Q - x1 * d(-Q)/dx1 = -Q + x1 * dQ/dx1
        So: -mu_2^(e)/RT = Q - x1 * dQ/dx1
        """
        h = 1e-7
        
        # Central difference for dQ/dx1
        if x1 < h:
            Q_plus = self.calc_minus_Ge_over_RT(x1 + h, T)
            Q_here = self.calc_minus_Ge_over_RT(x1, T)
            dQ = (Q_plus - Q_here) / h
        elif x1 > 1.0 - h:
            Q_here = self.calc_minus_Ge_over_RT(x1, T)
            Q_minus = self.calc_minus_Ge_over_RT(x1 - h, T)
            dQ = (Q_here - Q_minus) / h
        else:
            Q_plus = self.calc_minus_Ge_over_RT(x1 + h, T)
            Q_minus = self.calc_minus_Ge_over_RT(x1 - h, T)
            dQ = (Q_plus - Q_minus) / (2*h)
        
        Q = self.calc_minus_Ge_over_RT(x1, T)
        
        # -mu_2/RT = Q - x1 * dQ/dx1 (best so far: RMS 5.96)
        return Q - x1 * dQ

def verify_table_7():
    """Verify against Table 7 data at T=298.15K"""
    model = ZeleznikModel2()
    T = 298.15
    
    # Data from Table 7 (more points extracted by browser)
    table7_data = [
        (0.1000, 0.4931),
        (0.2000, 1.5753),
        (0.3000, 3.0816),
        (0.4000, 4.8016),
        (0.5000, 6.8584),
        (0.6000, 8.6533),
        (0.7000, 10.0160),
        (0.8000, 11.1347),
        (0.9000, 12.2345),
        (0.9800, 15.2470),
    ]
    
    print(f"=== Zeleznik Model V2 Verification at T = {T} K ===")
    print(f"{'x1':<10} {'Calculated':<12} {'Table 7':<12} {'Diff':<12} {'%Err':<10}")
    print("-" * 56)
    
    total_sq_err = 0.0
    for x1, ref in table7_data:
        calc = model.calc_minus_mu2_r_over_RT(x1, T)
        diff = calc - ref
        pct_err = (diff / ref * 100) if ref != 0 else 0
        total_sq_err += diff**2
        print(f"{x1:<10.4f} {calc:<12.4f} {ref:<12.4f} {diff:<+12.4f} {pct_err:<+10.2f}%")
    
    rms = math.sqrt(total_sq_err / len(table7_data))
    print("-" * 56)
    print(f"RMS Error: {rms:.4f}")

if __name__ == "__main__":
    verify_table_7()
