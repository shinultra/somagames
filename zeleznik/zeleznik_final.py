
import math

class ZeleznikFinal:
    def __init__(self):
        # Coefficients from Table 6
        self.mu_db = {
            '111': [-0.235245033870E+02, 0.406889449841E-01, -0.151369362907E-04, 0.296144445015E+04, 0.492476973663E+00],
            '121': [0.111458541077E+04, -0.118330789360E+01, -0.209946114412E-02, -0.246749842271E+06, 0.341234558134E+02],
            '221': [-0.801488100747E+02, -0.116246143257E-01, 0.606767928954E-05, 0.309272150882E+04, 0.127601667471E+02],
            '122': [0.888711613784E+03, -0.250531359687E+01, 0.605638824061E-03, -0.196983296431E+06, 0.745500643380E+02]
        }
        self.mu_db['211'] = self.mu_db['121']
        self.mu_db['212'] = self.mu_db['122']

        self.eps_db = {
            '111': [0.288731663295E+04, -0.332602457749E+01, -0.282047283300E-02, -0.528216112353E+06, 0.686997435643E+00],
            '121': [-0.370944593249E+03, -0.690310834523E+00, 0.563455068422E-03, -0.382252997064E+04, 0.942682037574E+02],
            '211': [0.383025318809E+02, -0.295997878789E-01, 0.120999746782E-04, -0.324697498999E+04, -0.383566039532E+01],
            '221': [0.232476399402E+04, -0.141626921317E+00, -0.626760562881E-02, -0.430390687961E+06, -0.612339472744E+02],
            '122': [-0.163385547832E+04, -0.335344369968E+01, 0.710978119903E-02, 0.198200003569E+06, 0.246693619189E+03],
            '212': [0.127375159848E+04, 0.103333898148E+01, 0.341400487633E-02, 0.195290667051E+06, -0.431737442782E+03]
        }

    def _get_val(self, db, key, T):
        if key not in db: return 0.0
        c = db[key]
        return c[0] + c[1]*T + c[2]*(T**2) + c[3]/T + c[4]*math.log(T)

    def calc_Q_term(self, x_species, T, flip_phi2=False):
        x = x_species
        
        # Phi(1) = 1
        # Phi(2) = x1*x2*(x1-x2)
        # If flip_phi2 is True: Phi(2) = x1*x2*(x2-x1)
        
        phi2 = x[1]*x[2]*(x[1]-x[2])
        if flip_phi2:
            phi2 = -phi2
            
        phi = {1: 1.0, 2: phi2}

        ln_x = {}
        for idx in [1, 2]:
            ln_x[idx] = math.log(x[idx]) if x[idx] > 1e-100 else -230.0

        total_Q = 0.0
        
        for i in [1, 2]:
            if abs(phi[i]) < 1e-20: continue
            
            inner_sum = 0.0
            for j in [1, 2]:
                for k in [1, 2]:
                    key = f"{j}{k}{i}"
                    mu = self._get_val(self.mu_db, key, T)
                    eps = self._get_val(self.eps_db, key, T)
                    
                    # LOG INDEX is k (confirmed)
                    log_term = ln_x[k]

                    term = (mu + eps * log_term) * x[j] * x[k]
                    inner_sum += term
            
            total_Q += phi[i] * inner_sum
            
        return total_Q

    def calc_prop(self, x_acid, T, flip_phi2=False):
        # 1=Acid, 2=Water
        x1 = x_acid
        x2 = 1.0 - x1
        x_species = {1: x1, 2: x2}
        
        h = 1e-7
        Q = self.calc_Q_term(x_species, T, flip_phi2)
        
        # dQ/dx1 (Acid)
        if x1 > 0.5:
             x1_m = x1 - h
             Q_m = self.calc_Q_term({1: x1_m, 2: 1.0-x1_m}, T, flip_phi2)
             dQdx1 = (Q - Q_m)/h
        else:
             x1_p = x1 + h
             Q_p = self.calc_Q_term({1: x1_p, 2: 1.0-x1_p}, T, flip_phi2)
             dQdx1 = (Q_p - Q)/h
             
        # Water Property (-mu2/RT)
        # = Q - x1 * dQdx1 - ln x2
        val = Q - x1 * dQdx1 - (math.log(x2) if x2>1e-100 else -230)
        return val

def generate_table():
    model = ZeleznikFinal()
    T = 298.15
    
    # Validation points
    ref_data = {
        0.10: 0.4931,
        0.50: 6.8584,
        0.90: 12.2345,
        0.98: 15.2470
    }
    
    x_vals = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98]
    
    print("| x_acid (x1) | Ref (-mu2/RT) | Calc (-mu2/RT) | Diff |")
    print("|---|---|---|---|")
    
    for x in x_vals:
        val = model.calc_prop(x, T, False)
        ref = ref_data.get(x, "")
        diff = ""
        if ref != "":
            diff = f"{val - ref:.4f}"
            ref = f"{ref:.4f}"
        
        print(f"| {x:.2f} | {ref} | {val:.4f} | {diff} |")

if __name__ == "__main__":
    generate_table()
