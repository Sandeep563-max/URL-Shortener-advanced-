import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import QRCode from "react-qr-code";
import QRCodeGenerator from "qrcode";
import { AuthContext } from "../context/AuthContext"; 

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function Home() {
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState(""); 
  const [error, setError] = useState(null); 
  
  const [shortUrl, setShortUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        try {
          const config = {
            withCredentials: true
          };
          
          const res = await axios.get(`${API_BASE_URL}/my-links`, config);
          setHistory(res.data);
        } catch (error) {
          console.error("Failed to fetch user links", error);
        }
      } else {
        const savedHistory = JSON.parse(localStorage.getItem("guestUrlHistory") || "[]");
        setHistory(savedHistory);
      }
    };
    fetchHistory();
  }, [user]); 

  const handleShorten = async () => {
    if (!url) return;
    setError(null); 

    try {
      const config = user ? {
        withCredentials: true
      } : {};

      const res = await axios.post(`${API_BASE_URL}/shorten`, { 
        originalUrl: url,
        customAlias: customAlias.trim() !== "" ? customAlias : undefined
      }, config);
      
      const { shortUrl, shortId, originalUrl } = res.data; 
      
      setShortUrl(shortUrl);
      setCopied(false);
      setCustomAlias(""); 

      const stats = await axios.get(`${API_BASE_URL}/analytics/${shortId}`);
      setAnalytics(stats.data);

      const qr = await QRCodeGenerator.toDataURL(shortUrl);
      setQrImage(qr);

      const newHistoryItem = { originalUrl: originalUrl || url, shortUrl, shortId };
      
      if (user) {
        setHistory(prev => [newHistoryItem, ...prev]);
      } else {
        const updatedHistory = [
          newHistoryItem, 
          ...history.filter(item => item.shortId !== shortId) 
        ].slice(0, 5); 
        setHistory(updatedHistory);
        localStorage.setItem("guestUrlHistory", JSON.stringify(updatedHistory));
      }
    
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  const handleCopy = (linkToCopy) => {
    navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-6 gap-6 bg-base-200">
      
      <div className="w-full max-w-3xl flex justify-between items-center bg-base-100 p-4 rounded-xl shadow-sm mb-4">
        <div>
          <span className="text-gray-500 font-medium">Status: </span>
          <span className="text-primary font-bold">{user ? user.email : "Guest"}</span>
        </div>
        
        {user ? (
          <button onClick={logout} className="btn btn-sm btn-outline btn-error">
            Logout
          </button>
        ) : (
          <button onClick={() => navigate('/auth')} className="btn btn-sm btn-outline btn-primary">
            Login / Sign Up
          </button>
        )}
      </div>

      <h1 className="text-4xl font-bold mb-4 text-center">URL SHORTENER</h1>
      
      <div className="flex flex-col gap-3 w-full max-w-3xl bg-base-100 p-6 rounded-xl shadow-lg">
        <input 
          type="text" 
          className="input input-bordered input-success w-full" 
          placeholder="Enter long URL" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
        />

        <div className="relative w-full flex items-center">
          <span className="absolute left-3 text-gray-400 font-mono">/</span>
          <input
            type="text"
            className="input input-bordered w-full pl-7"
            placeholder={user ? "custom-alias (optional)" : "Login to use custom aliases"}
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            disabled={!user} 
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium px-1">{error}</p>}

        <button onClick={handleShorten} className="btn btn-primary w-full mt-2"> 
          Shorten
        </button>
      </div>

      {shortUrl && (
        <div className="flex flex-col items-center max-w-3xl w-full bg-base-100 p-6 rounded-xl shadow-lg">
            {analytics && (
                <div className="stats shadow mb-6 w-full text-center border border-base-300">
                    <div className="stat">
                        <div className="stat-title">Total Clicks</div>
                        <div className="stat-value text-primary">{analytics.clicks}</div>
                        <div className="stat-desc">Updated via background worker</div>
                    </div>
                </div>
            )}

            <p className="font-medium mb-2">Your short link:</p>
            <a className="link link-primary break-all text-lg" target="_blank" href={shortUrl} rel="noreferrer"> {shortUrl} </a>
            <button onClick={() => handleCopy(shortUrl)} className={`btn mt-4 w-full ${copied ? "btn-success" : "btn-secondary"}`}>
                {copied ? "Copied!" : "Copy Link"}
            </button>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border mt-6">
                <p className="mb-2 text-center font-semibold text-neutral">Scan QR Code:</p>
                <QRCode value={shortUrl} size={150} />
            </div>

            {qrImage && (
                <a className="btn btn-outline btn-accent mt-4 w-full" download="qr-code.png" href={qrImage}>
                    Download QR
                </a>
            )}
        </div>
      )}

      {history.length > 0 && (
        <div className="w-full max-w-3xl mt-8">
          <h2 className="text-2xl font-bold mb-4">{user ? "Your Permanent History" : "Recent Links (Guest)"}</h2>
          <div className="flex flex-col gap-3">
            {history.map((item, index) => (
              <div key={index} className="bg-base-100 p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="overflow-hidden w-full">
                  <p className="text-sm text-gray-500 truncate">{item.originalUrl}</p>
                  <a href={item.shortUrl} target="_blank" className="link link-primary font-medium" rel="noreferrer">{item.shortUrl}</a>
                </div>
                <button onClick={() => handleCopy(item.shortUrl)} className="btn btn-sm btn-ghost border border-base-300">
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;