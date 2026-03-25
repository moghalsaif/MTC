import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const BG_IMAGE = 'https://static.prod-images.emergentagent.com/jobs/62d7898c-7789-4ffd-b52a-affeacb9c778/images/6cdc499d94530ba3eb412e9b7042e3ad6c0a9680d3a948d68eb2c5f0bea56a8e.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success('Login successful');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* World map background */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: 'cover',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#18181B]/90 backdrop-blur-xl border border-[#232328] rounded-2xl p-8 shadow-2xl">
          <h1 className="font-heading text-4xl font-black text-white tracking-tight mb-1" data-testid="login-title">
            MACH TRAFFIC CONTROLLER
          </h1>
          <p className="text-[#71717A] text-[10px] tracking-widest uppercase mb-2">a lwt group company</p>
          <p className="text-[#A1A1AA] text-sm mb-8">Virtual Production Equipment Tracker</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11 rounded-lg"
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
                className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              data-testid="submit-button"
              disabled={loading}
              className="w-full bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg h-11 shadow-lg"
            >
              {loading ? 'PROCESSING...' : 'LOGIN'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
