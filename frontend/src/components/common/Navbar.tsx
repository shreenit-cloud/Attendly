import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/context/authStore';
import { LogOut, ScanFace, User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 border-x-0 border-t-0">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to={user?.role === 'student' ? '/student' : '/teacher'} className="flex items-center gap-2 font-semibold text-xl text-foreground">
          <span className="rounded-xl border border-[#f17868]/30 bg-[#f17868]/10 p-2"><ScanFace className="h-5 w-5 text-primary" /></span>
          <span>Attend<span className="text-[#f17868]">ly</span></span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{user.name}</span>
              <span className="text-muted-foreground">({user.role})</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}