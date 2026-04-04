import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CodeBank() {
  const [savedCodes, setSavedCodes] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedCodes');
    return saved ? JSON.parse(saved) : [];
  });

  const compressCodes = () => {
    // Simulate compression - remove all codes and add a silver/gold bar
    const compressionType = savedCodes.length >= 1000 ? 'GOLD' : 'SILVER';
    const compressedItem = `${compressionType}-BAR-${Date.now()}`;
    
    // Clear codes and add compressed item
    localStorage.setItem('savedCodes', JSON.stringify([compressedItem]));
    setSavedCodes([compressedItem]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Code Bank</h1>
          <Link 
            to="/" 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-all"
          >
            ← Back to Watch
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved Codes */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Saved Codes ({savedCodes.length})</h2>
            
            {savedCodes.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedCodes.map((code, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border text-sm font-mono ${
                      code.includes('GOLD-BAR') 
                        ? 'bg-yellow-900/50 border-yellow-500 text-yellow-200'
                        : code.includes('SILVER-BAR')
                        ? 'bg-gray-600/50 border-gray-400 text-gray-200'
                        : 'bg-green-900/50 border-green-500 text-green-200'
                    }`}
                  >
                    {code}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No codes saved yet. Start watching to generate codes!</p>
            )}

            {savedCodes.length >= 10 && !savedCodes.some(code => code.includes('BAR')) && (
              <button
                onClick={compressCodes}
                className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
              >
                Compress to {savedCodes.length >= 1000 ? 'Gold' : 'Silver'} Bar
              </button>
            )}
          </div>

          {/* Statistics */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Statistics</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total Codes:</span>
                <span className="text-green-400">{savedCodes.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Silver Bars:</span>
                <span className="text-gray-400">
                  {savedCodes.filter(code => code.includes('SILVER-BAR')).length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Gold Bars:</span>
                <span className="text-yellow-400">
                  {savedCodes.filter(code => code.includes('GOLD-BAR')).length}
                </span>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
              <h3 className="font-semibold text-blue-200 mb-2">Compression Guide</h3>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• 10-999 codes → Silver Bar</li>
                <li>• 1000+ codes → Gold Bar</li>
                <li>• Bars are worth more than individual codes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
