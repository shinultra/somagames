
import math

class ZeleznikModel:
    def __init__(self):
        # Coefficients from solve.py (Table 6)
        self.mu_coeffs = {
            '111': [-0.235245033870E+02, 0.406889449841E-01, -0.151369362907E-04, 0.296144445015E+04, 0.492476973663E+00],
            '121': [0.111458541077E+04, -0.118330789360E+01, -0.209946114412E-02, -0.246749842271E+06, 0.341234558134E+02],
            '221': [-0.801488100747E+02, -0.116246143257E-01, 0.606767928954E-05, 0.309272150882E+04, 0.127601667471E+02],
            '122': [0.888711613784E+03, -0.250531359687E+01, 0.605638824061E-03, -0.196983296431E+06, 0.745500643380E+02]
        }
        
        self.eps_coeffs = {
            '111': [0.288731663295E+04, -0.332602457749E+01, -0.282047283300E-02, -0.528216112353E+06, 0.686997435643E+00],
            '121': [-0.370944593249E+03, -0.690310834523E+00, 0.563455068422E-03, -0.382252997064E+04, 0.942682037574E+02],
            '211': [0.383025318809E+02, -0.295997878789E-01, 0.120999746782E-04, -0.324697498999E+04, -0.383566039532E+01],
            '221': [0.232476399402E+04, -0.141626921317E+00, -0.626760562881E-02, -0.430390687961E+06, -0.612339472744E+02],
            '122': [-0.163385547832E+04, -0.335344369968E+01, 0.710978119903E-02, 0.198200003569E+06, 0.246693619189E+03],
            '212': [0.127375159848E+04, 0.103333898148E+01, 0.341400487633E-02, 0.195290667051E+06, -0.431737442782E+03]
        }

        # Symmetries for mu (assuming missing ones are symmetric)
        self.mu_coeffs['211'] = self.mu_coeffs['121']
        self.mu_coeffs['212'] = self.mu_coeffs['122']

    def get_val(self, db, j, k, i, T):
        key = f"{j}{k}{i}"
        if key not in db:
            return 0.0
        c = db[key]
        return c[0] + c[1]*T + c[2]*(T**2) + c[3]/T + c[4]*math.log(T)

    def debug_Q(self, x1, T):
        x = {1: x1, 2: 1.0 - x1}
        phi = {1: 1.0, 2: x1 * (1.0 - x1)} # phi(2) = x1*x2
        
        print(f"DEBUG Q for x1={x1}, T={T}")
        Q_total = 0.0
        for i in [1, 2]:
            S_i = 0.0
            ln_xi = math.log(x[i]) if x[i] > 1e-50 else -115.0
            print(f"  i={i}, phi={phi[i]}, ln_xi={ln_xi}")
            
            for j in [1, 2]:
                for k in [1, 2]:
                    mu = self.get_val(self.mu_coeffs, j, k, i, T)
                    eps = self.get_val(self.eps_coeffs, j, k, i, T)
                    
                    term_val = (mu + eps * ln_xi) * x[j] * x[k]
                    S_i += term_val
                    print(f"    j={j}, k={k}: mu={mu:10.2f}, eps={eps:10.2f}, term={term_val:10.2f}")
            
            contrib = phi[i] * S_i
            print(f"  Sum_i contrib: {contrib}")
            Q_total += contrib
        
        print(f"Total Q: {Q_total}")
        return Q_total

if __name__ == "__main__":
    model = ZeleznikModel()
    model.debug_Q(0.1, 298.15)
