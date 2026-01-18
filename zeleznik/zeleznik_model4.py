
import math

class ZeleznikModel4:
    def __init__(self):
        # Coefficients from Table 6
        # Format: jki
        # Basis: 1, T, T^2, 1/T, ln(T)
        self.mu_db = {
            '111': [-0.235245033870E+02, 0.406889449841E-01, -0.151369362907E-04, 0.296144445015E+04, 0.492476973663E+00],
            '121': [0.111458541077E+04, -0.118330789360E+01, -0.209946114412E-02, -0.246749842271E+06, 0.341234558134E+02],
            '221': [-0.801488100747E+02, -0.116246143257E-01, 0.606767928954E-05, 0.309272150882E+04, 0.127601667471E+02],
            '122': [0.888711613784E+03, -0.250531359687E+01, 0.605638824061E-03, -0.196983296431E+06, 0.745500643380E+02]
        }
        # Symmetric mu: 211=121, 212=122
        self.mu_db['211'] = self.mu_db['121']
        self.mu_db['212'] = self.mu_db['122']
        # Missing assumed 0? 112, 222 likely 0 or not listed.

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

    def calc_Q_term(self, x_species, T, phi_mode, log_mode):
        """
        Calculates Q = -G^E/RT defined by Eq 12.
        x_species is a dict {1: x1, 2: x2}.
        phi_mode:
          'A': Phi1=x1x2, Phi2=x1x2(x1-x2) (Step 422)
          'B': Phi1=1, Phi2=x1/x2 (Step 430)
          'C': Phi1=1, Phi2=x1*x2 (Plausible)
          'D': Phi1=1, Phi2=x1*x2*(x1-x2)
        log_mode:
          'j': ln x_j
          'k': ln x_k
          'i': ln x_i
        """
        x = x_species
        
        if phi_mode == 'A':
            phi = {1: x[1]*x[2], 2: x[1]*x[2]*(x[1]-x[2])}
        elif phi_mode == 'B':
            phi = {1: 1.0, 2: x[1]/x[2] if x[2]>1e-10 else 0}
        elif phi_mode == 'C':
            phi = {1: 1.0, 2: x[1]*x[2]}
        elif phi_mode == 'D':
            phi = {1: 1.0, 2: x[1]*x[2]*(x[1]-x[2])}

        ln_x = {}
        for idx in [1, 2]:
            ln_x[idx] = math.log(x[idx]) if x[idx] > 1e-50 else -115.0

        total_Q = 0.0
        
        for i in [1, 2]:
            if abs(phi[i]) < 1e-20: continue
            
            # Coefficients from DB are assumed correct for jki ordering
            # Note: DB has explicit keys like '121', '211'
            
            inner_sum = 0.0
            for j in [1, 2]:
                for k in [1, 2]:
                    key = f"{j}{k}{i}"
                    
                    mu = self._get_val(self.mu_db, key, T)
                    eps = self._get_val(self.eps_db, key, T)
                    
                    # Log term selection
                    if log_mode == 'j':
                        log_term = ln_x[j]
                    elif log_mode == 'k':
                        log_term = ln_x[k]
                    elif log_mode == 'i':
                        log_term = ln_x[i]

                    # Term
                    term = (mu + eps * log_term) * x[j] * x[k]
                    inner_sum += term
            
            total_Q += phi[i] * inner_sum
            
        return total_Q

    def calc_properties(self, x_acid_in, T, combination):
        phi_mode, log_mode = combination
        
        # Fixed: 1=Acid, 2=Water
        x1 = x_acid_in
        x2 = 1.0 - x1
        x_species = {1: x1, 2: x2}
        
        # Calculate Q and derivatives numerically
        h = 1e-7
        
        Q = self.calc_Q_term(x_species, T, phi_mode, log_mode)
        
        # Derivative dQ/dx1 (keeping x1+x2=1)
        if x1 > 0.5:
             x1_m = x1 - h
             Q_m = self.calc_Q_term({1: x1_m, 2: 1.0-x1_m}, T, phi_mode, log_mode)
             dQdx1 = (Q - Q_m)/h
        else:
             x1_p = x1 + h
             Q_p = self.calc_Q_term({1: x1_p, 2: 1.0-x1_p}, T, phi_mode, log_mode)
             dQdx1 = (Q_p - Q)/h
             
        # Target: Water Property (-mu2(r)/RT)
        # Formula: Q - x1 * dQdx1 - ln x2
        val_2 = Q - x1 * dQdx1 - (math.log(x2) if x2>1e-50 else -100)
        
        return val_2

def test_hypothesis():
    model = ZeleznikModel4()
    T = 298.15
    
    points = [
        (0.10, 0.4931),
        (0.50, 6.8584),
        (0.90, 12.2345),
        (0.98, 15.2470)
    ]
    
    
    phi_modes = ['D', 'D_flip']
    log_modes = ['k']
    
    results = []
    
    print("\nRunning Refinement for Zeleznik Model V4...")
    print(f"{'Phi':<10} {'Log':<5} {'RMSE':<10} {'x=0.1':<10} {'x=0.5':<10} {'x=0.98':<10}")
    
    for p in phi_modes:
        for l in log_modes:
            rmse = 0
            devs = []
            for x_acid, ref in points:
                # Hack for D_flip
                if p == 'D_flip':
                     # Handled inside calc_Q_term if I modified it, but I didn't.
                     # Let's modify calc_Q_term briefly or just patch the phi dict here? 
                     # Can't patch method. 
                     # I will assume Mode D and manually flip in loop? No.
                     pass 
                
                # Actually, I need to modify calc_Q_term to support 'D_flip'
                pass

    # Quick patch to calc_Q_term to support 'D_flip'
    def calc_Q_term_patched(self, x_species, T, phi_mode, log_mode):
        x = x_species
        if phi_mode == 'D':
            phi = {1: 1.0, 2: x[1]*x[2]*(x[1]-x[2])}
        elif phi_mode == 'D_flip':
            phi = {1: 1.0, 2: -1.0 * x[1]*x[2]*(x[1]-x[2])}
        
        # ... copy rest of logic ...
        # Faster to just use ReplaceFileContent to update calc_Q_term properly.
        # But for now, let's just stick to D.


if __name__ == "__main__":
    test_hypothesis()
