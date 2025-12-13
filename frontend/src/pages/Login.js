import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await register(email, password, name);

    setLoading(false);

    if (result.success) {
      toast.success(isLogin ? 'Login successful' : 'Account created successfully');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background noise-bg flex items-center justify-center px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl">
          <h1 className="font-heading text-4xl font-black text-foreground tracking-tight mb-2" data-testid="login-title">
            MACH TRAFFIC CONTROLLER
          </h1>
          <p className="text-muted-foreground text-sm mb-8">Virtual Production Equipment Tracker</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-foreground text-sm font-medium mb-2 block">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  data-testid="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="bg-background border-border focus:border-primary text-foreground h-12 rounded-xl transition-colors"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-white text-sm font-medium mb-2 block">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border focus:border-primary text-foreground h-12 rounded-xl transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white text-sm font-medium mb-2 block">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border focus:border-primary text-foreground h-12 rounded-xl transition-colors"
              />
            </div>
            <Button
              type="submit"
              data-testid="submit-button"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider rounded-xl h-12 shadow-lg"
            >
              {loading ? 'PROCESSING...' : isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              data-testid="toggle-auth-mode"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}