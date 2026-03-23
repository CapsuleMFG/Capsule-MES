import { useState } from 'react';
import axios from 'axios';
import { useKiosk } from '../../contexts/KioskContext';
import { useToast } from '../../contexts/ToastContext';
import { authenticateStation } from '../../services/parts-tracking.service';
import { Backspace, SignIn } from '@phosphor-icons/react';

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
      login(result);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'Invalid PIN code';
      toast.error(message);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="mb-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wider">CAPSULE</h1>
        <p className="text-gray-400 mt-2 text-lg">Station Kiosk</p>
      </div>

      {/* PIN Display */}
      <div className="mb-8 w-full max-w-sm">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-5 text-center">
          <p className="text-gray-400 text-sm mb-2">Enter Station PIN</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  i < pin.length
                    ? 'bg-gray-900 border-gray-900'
                    : 'border-gray-200'
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
              className="w-16 h-16 mx-auto text-2xl rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all text-gray-900 font-semibold touch-manipulation"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            onClick={handleClear}
            className="w-16 h-16 mx-auto text-sm font-medium rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all text-gray-400 touch-manipulation"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-16 mx-auto text-2xl rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all text-gray-900 font-semibold touch-manipulation"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 active:scale-[0.97] transition-all text-gray-400 flex items-center justify-center touch-manipulation"
          >
            <Backspace className="w-6 h-6" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || isLoading}
          className={`mt-4 w-full py-3 px-6 text-base rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all touch-manipulation ${
            pin.length >= 4 && !isLoading
              ? 'bg-gray-900 hover:bg-gray-800 active:scale-[0.97] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <SignIn className="w-5 h-5" />
          {isLoading ? 'Authenticating...' : 'Login'}
        </button>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="mt-8 text-gray-400 hover:text-gray-600 text-sm transition-colors"
      >
        Back to main app
      </a>
    </div>
  );
}
