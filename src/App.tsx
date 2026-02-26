import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  MapPin, 
  Camera, 
  Shield, 
  LogOut, 
  LayoutDashboard, 
  User, 
  Moon, 
  Sun, 
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface User {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface AttendanceLog {
  id: number;
  employee_id: string;
  employee_name: string;
  timestamp: string;
  type: 'IN' | 'OUT';
  latitude: number;
  longitude: number;
  photo_path: string;
  gps_status: string;
}

// Constants
const OFFICE_COORDS = { lat: 51.5074, lng: -0.1278 }; // Example: London
const GEOFENCE_RADIUS = 200; // meters

// Helper: Calculate distance between two points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'clock' | 'admin'>('login');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center">
            <Clock className="text-white dark:text-zinc-900 w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Chronos</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user && (
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoginView onLogin={(u) => { setUser(u); setView('clock'); }} />
            </motion.div>
          )}
          {view === 'clock' && user && (
            <motion.div key="clock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ClockView user={user} setView={setView} />
            </motion.div>
          )}
          {view === 'admin' && user?.isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AdminView setView={setView} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto space-y-6">
          {user?.isAdmin && (
            <div className="flex justify-center">
              <button 
                onClick={() => setView(view === 'admin' ? 'clock' : 'admin')}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                {view === 'admin' ? 'Return to Clock In' : 'Administrator Dashboard'}
              </button>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Data Privacy Notice</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This system captures GPS coordinates and a photographic snapshot at the time of clock-in/out for identity verification and location compliance. All biometric and location data is stored securely and used exclusively for attendance management. By using this system, you consent to this data collection.
            </p>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              &copy; 2026 Chronos Systems • Secure Attendance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: (user: User) => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, pin }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-panel p-8 w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Please enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Employee ID</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="input-field pl-12" 
              placeholder="e.g. EMP001"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">4-Digit PIN</label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="password" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field pl-12 tracking-[1em]" 
              placeholder="••••"
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? 'Verifying...' : 'Login to System'}
        </button>
      </form>
    </motion.div>
  );
}

function ClockView({ user, setView }: { user: User, setView: (v: 'login' | 'clock' | 'admin') => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'OK' | 'Out of Range' | 'Searching'>('Searching');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Start camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      })
      .catch(err => {
        console.error("Camera error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("Camera access denied. Please enable camera permissions in your browser settings to clock in/out.");
        } else {
          setCameraError("Could not access camera. Please check your hardware and try again.");
        }
      });

    // Get location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        const dist = getDistance(coords.lat, coords.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
        setGpsStatus(dist <= GEOFENCE_RADIUS ? 'OK' : 'Out of Range');
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsStatus('Out of Range');
      }
    );

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleClock = async (type: 'IN' | 'OUT') => {
    setLoading(true);
    setMessage(null);

    if (cameraError) {
      setMessage({ type: 'error', text: 'Camera access is required for verification.' });
      setLoading(false);
      return;
    }

    // Capture photo
    let photoBase64 = null;
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        photoBase64 = canvasRef.current.toDataURL('image/png');
      }
    }

    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          type,
          latitude: location?.lat,
          longitude: location?.lng,
          photo: photoBase64,
          gpsStatus
        }),
      });
      
      if (res.ok) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessage({ type: 'success', text: `Successfully clocked ${type.toLowerCase()} at ${timeStr}!` });
      } else {
        setMessage({ type: 'error', text: 'Failed to record attendance.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl space-y-6"
    >
      <div className="glass-panel p-6 flex flex-col md:flex-row gap-8 items-center">
        {/* Camera Preview */}
        <div className="relative w-full md:w-1/2 aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden border-4 border-white dark:border-zinc-800 shadow-xl flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {cameraError}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white underline underline-offset-4"
              >
                Retry Permission
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
                <Camera className="w-3 h-3" />
                Live Verification
              </div>
              <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-1/3 h-full bg-white/60"
                />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="w-full md:w-1/2 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">{user.name}</h2>
              <p className="text-zinc-500 font-mono text-sm">{user.id}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold tracking-tighter">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <MapPin className={`w-5 h-5 ${gpsStatus === 'OK' ? 'text-emerald-500' : 'text-amber-500'}`} />
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-400">Location Status</p>
                  <p className="text-sm font-medium">{gpsStatus}</p>
                </div>
              </div>
              {gpsStatus === 'OK' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-500" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleClock('IN')}
                disabled={loading}
                className="h-32 flex flex-col items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-sm">Clock In</span>
              </button>

              <button 
                onClick={() => handleClock('OUT')}
                disabled={loading}
                className="h-32 flex flex-col items-center justify-center gap-3 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-zinc-900/20"
              >
                <div className="w-12 h-12 bg-white/20 dark:bg-zinc-900/10 rounded-full flex items-center justify-center">
                  <LogOut className="w-6 h-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-sm">Clock Out</span>
              </button>
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{message.text}</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AdminView({ setView }: { setView: (v: 'login' | 'clock' | 'admin') => void }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/export';
  };

  // Simple shift calculation (pairing consecutive IN/OUT for same employee)
  const calculateShifts = () => {
    const shifts: any[] = [];
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastIn: Record<string, AttendanceLog> = {};

    sortedLogs.forEach(log => {
      if (log.type === 'IN') {
        lastIn[log.employee_id] = log;
      } else if (log.type === 'OUT' && lastIn[log.employee_id]) {
        const inLog = lastIn[log.employee_id];
        const durationMs = new Date(log.timestamp).getTime() - new Date(inLog.timestamp).getTime();
        const hours = durationMs / (1000 * 60 * 60);
        shifts.push({
          employee: log.employee_name,
          date: new Date(inLog.timestamp).toLocaleDateString(),
          in: new Date(inLog.timestamp).toLocaleTimeString(),
          out: new Date(log.timestamp).toLocaleTimeString(),
          hours: hours.toFixed(2),
          isOvertime: hours > 8
        });
        delete lastIn[log.employee_id];
      }
    });
    return shifts.reverse();
  };

  const shifts = calculateShifts();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl space-y-8"
    >
      <button 
        onClick={() => setView('clock')}
        className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2 transition-colors mb-2"
      >
        ← Back to Clock In
      </button>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-zinc-500">Manage attendance, shifts, and payroll reports</p>
        </div>
        <button 
          onClick={handleExport}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Shift Summary */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Shift Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.slice(0, 6).map((shift, i) => (
            <div key={i} className={`glass-panel p-4 border-l-4 ${shift.isOvertime ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold">{shift.employee}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${shift.isOvertime ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {shift.hours} hrs
                </span>
              </div>
              <p className="text-xs text-zinc-500">{shift.date} • {shift.in} - {shift.out}</p>
              {shift.isOvertime && (
                <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> OVERTIME DETECTED
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Logs */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Detailed Activity Log</h3>
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Employee</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timestamp</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Action</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">GPS Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-400">Loading records...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-400">No attendance records found</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold">
                            {log.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{log.employee_name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{log.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{new Date(log.timestamp).toLocaleString()}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.type === 'IN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${log.gps_status === 'OK' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-sm">{log.gps_status}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {log.photo_path ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img 
                              src={log.photo_path} 
                              alt="Verification" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Camera className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
