import { useState } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { useToast } from '../../contexts/ToastContext';
import { authenticateStation } from '../../services/parts-tracking.service';
import { Delete, LogIn } from 'lucide-react';

export default function StationLogin() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useKiosk();
  const toast = useToast();

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      toast.warning('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateStation({ pinCode: pin });
      login(result.stationName, result.kioskId);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Invalid PIN code';
      toast.error(message);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-amber-500 tracking-wider">CAPSULE</h1>
        <p className="text-gray-400 mt-2 text-lg">Station Kiosk</p>
      </div>

      {/* PIN Display */}
      <div className="mb-8 w-full max-w-sm">
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-6 py-5 text-center">
          <p className="text-gray-400 text-sm mb-2">Enter Station PIN</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  i < pin.length
                    ? 'bg-amber-500 border-amber-500'
                    : 'border-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Numpad */}
      <div className="w-full max-w-sm">
        <div className="grid grid-cols-3 gap-3">
          {digits.map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-20 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-semibold rounded-xl transition-colors touch-manipulation"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            onClick={handleClear}
            className="h-20 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-400 text-sm font-medium rounded-xl transition-colors touch-manipulation"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-20 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-semibold rounded-xl transition-colors touch-manipulation"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-20 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-400 rounded-xl transition-colors flex items-center justify-center touch-manipulation"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || isLoading}
          className={`mt-4 w-full h-16 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 transition-colors touch-manipulation ${
            pin.length >= 4 && !isLoading
              ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <LogIn className="w-5 h-5" />
          {isLoading ? 'Authenticating...' : 'Login'}
        </button>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-8 text-gray-500 hover:text-gray-400 text-sm transition-colors"
      >
        Back to main app
      </a>
    </div>
  );
}
