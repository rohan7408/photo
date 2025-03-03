import React from 'react';

const pulseKeyframes = `
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.1); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;

const App = () => {
  const [capturedPhoto, setCapturedPhoto] = React.useState(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [countdown, setCountdown] = React.useState(null);
  const [photos, setPhotos] = React.useState([]);
  const [selectedFilter, setSelectedFilter] = React.useState('normal');
  const [isFrontCamera, setIsFrontCamera] = React.useState(true);
  const [isFlashing, setIsFlashing] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackStatus, setFeedbackStatus] = React.useState('');
  const [showToast, setShowToast] = React.useState(false);

  const startCamera = React.useCallback(async () => {
    try {
      // First stop any existing stream
      const videoElement = document.getElementById('camera-stream');
      if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }

      // Try to get the camera with specific constraints
      const constraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : { exact: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
      } catch (error) {
        // If exact 'environment' fails, try without 'exact'
        console.log('Trying fallback camera options...', error.message);
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        videoElement.srcObject = fallbackStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Try one last time with basic constraints
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
        const videoElement = document.getElementById('camera-stream');
        videoElement.srcObject = basicStream;
      } catch (finalError) {
        console.error('Final camera error:', finalError);
      }
    }
  }, [isFrontCamera]);

  const switchCamera = async () => {
    try {
      // Stop current stream before switching
      const videoElement = document.getElementById('camera-stream');
      if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };

  React.useEffect(() => {
    if (document.getElementById('camera-stream').srcObject) {
      startCamera();
    }
  }, [isFrontCamera, startCamera]);

  const applyFilter = (context, canvas, filter) => {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (filter) {
      case 'bw':
        // Black and White filter
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg;     // red
          data[i + 1] = avg; // green
          data[i + 2] = avg; // blue
        }
        break;
      
      case 'retro':
        // Retro/Vintage filter
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Sepia-like effect
          data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189); // red
          data[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168); // green
          data[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131); // blue
        }
        break;
      
      default:
        return; // Normal - no filter
    }

    context.putImageData(imageData, 0, 0);
  };

  const takePhoto = (video, canvas) => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // If using front camera, flip the context horizontally before drawing
    if (isFrontCamera) {
        context.scale(-1, 1);
        context.translate(-canvas.width, 0);
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transformation if we flipped it
    if (isFrontCamera) {
        context.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    // Apply selected filter
    applyFilter(context, canvas, selectedFilter);
    
    return canvas.toDataURL('image/jpeg');
  };

  const combinePhotos = (photos) => {
    return new Promise((resolve) => {
      const loadedImages = [];
      
      photos.forEach((photoUrl, index) => {
        const img = new Image();
        img.onload = () => {
          loadedImages[index] = img;
          
          if (loadedImages.filter(Boolean).length === photos.length) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            const padding = 40;
            const spacing = 20;
            const photoWidth = loadedImages[0].width;
            const photoHeight = loadedImages[0].height;
            
            canvas.width = photoWidth + (padding * 2);
            canvas.height = (photoHeight * 4) + (padding * 2) + (spacing * 3);
            
            // Draw background frame
            context.fillStyle = '#f0f0f0';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add a decorative border
            context.strokeStyle = '#333';
            context.lineWidth = 2;
            context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // Function to create rounded rectangle path
            const roundedRect = (x, y, width, height, radius) => {
              context.beginPath();
              context.moveTo(x + radius, y);
              context.lineTo(x + width - radius, y);
              context.quadraticCurveTo(x + width, y, x + width, y + radius);
              context.lineTo(x + width, y + height - radius);
              context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
              context.lineTo(x + radius, y + height);
              context.quadraticCurveTo(x, y + height, x, y + height - radius);
              context.lineTo(x, y + radius);
              context.quadraticCurveTo(x, y, x + radius, y);
              context.closePath();
            };

            // Draw each photo with rounded corners
            loadedImages.forEach((image, i) => {
              const x = padding;
              const y = padding + (i * (photoHeight + spacing));
              
              // Save the context state before clipping
              context.save();
              
              // Create clipping path for rounded corners
              roundedRect(x, y, photoWidth, photoHeight, 15);
              context.clip();
              
              // Draw the image
              context.drawImage(image, x, y, photoWidth, photoHeight);
              
              // Restore context to remove clipping
              context.restore();
              
              // Add shadow effect
              context.save();
              context.shadowColor = 'rgba(0, 0, 0, 0.2)';
              context.shadowBlur = 10;
              context.shadowOffsetX = 0;
              context.shadowOffsetY = 2;
              
              // Draw border around the photo
              roundedRect(x, y, photoWidth, photoHeight, 15);
              context.strokeStyle = '#fff';
              context.lineWidth = 3;
              context.stroke();
              
              // Restore context for next iteration
              context.restore();
            });
            
            resolve(canvas.toDataURL('image/jpeg'));
          }
        };
        img.src = photoUrl;
      });
    });
  };

  const capturePhoto = async () => {
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('photo-canvas');
    const newPhotos = [];
    setPhotos([]);
    setIsCapturing(true);
    
    // Take 4 photos with 3-second intervals
    for (let i = 0; i < 4; i++) {
      // Countdown
      setCountdown(3);
      for (let j = 3; j > 0; j--) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCountdown(j - 1);
      }

      // Flash effect
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      const photo = takePhoto(video, canvas);
      newPhotos.push(photo);
      setPhotos([...newPhotos]); // Update photos array after each capture
      
      // Wait between photos if not the last one
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Combine all photos
    const combinedPhoto = await combinePhotos(newPhotos);
    setCapturedPhoto(combinedPhoto);
    setIsCapturing(false);
    setCountdown(null);
    setPhotos([]); // Clear photos array when done
  };

  const downloadPhoto = () => {
    if (!capturedPhoto) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `photos-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    setFeedbackStatus('sending');
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFeedbackStatus('success');
        e.target.reset();
        setShowFeedback(false);
        setShowToast(true);
        
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      } else {
        setFeedbackStatus('error');
      }
    } catch {
      setFeedbackStatus('error');
    }
  };

  React.useEffect(() => {
    // Add the keyframes to the document
    const style = document.createElement('style');
    style.textContent = pulseKeyframes;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 md:p-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 
          animate-slide-in-right flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Feedback sent successfully!</span>
        </div>
      )}

      {/* Add Feedback Button */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full 
          shadow-lg hover:bg-blue-600 transition-all z-50"
      >
        Feedback
      </button>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Send Feedback</h2>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleFeedbackSubmit}>
              <input 
                type="hidden" 
                name="access_key" 
                value="d3424bba-956d-4b76-bf02-c5883dd97d24"
              />
              <input 
                type="hidden" 
                name="from_name" 
                value="Photo Booth Feedback"
              />
              <input 
                type="hidden" 
                name="subject" 
                value="New Photo Booth Feedback"
              />
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    required
                    rows="4"
                    placeholder="Your feedback message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
                
                <button
                  type="submit"
                  disabled={feedbackStatus === 'sending'}
                  className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all
                    ${feedbackStatus === 'sending' 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  {feedbackStatus === 'sending' 
                    ? 'Sending...' 
                    : feedbackStatus === 'success'
                    ? 'Sent Successfully!'
                    : feedbackStatus === 'error'
                    ? 'Error! Try Again'
                    : 'Send Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left side - Camera Section */}
        <div className="flex-1 bg-white rounded-3xl shadow-lg p-4 md:p-6 flex flex-col gap-4 md:gap-6 md:max-w-2xl mx-auto">
          {/* Filter Selection */}
          <div className="flex flex-wrap justify-center gap-2 p-3 bg-gray-50 rounded-2xl">
            <button 
              onClick={() => setSelectedFilter('normal')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedFilter === 'normal' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Normal
            </button>
            <button 
              onClick={() => setSelectedFilter('bw')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedFilter === 'bw' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              B&W
            </button>
            <button 
              onClick={() => setSelectedFilter('retro')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedFilter === 'retro' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              Retro
            </button>
          </div>

          {/* Camera Container */}
          <div className="bg-gray-50 rounded-3xl p-3 md:p-4">
            <div className="relative w-full aspect-[3/4] md:aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden max-w-3xl mx-auto">
              <video
                id="camera-stream"
                autoPlay
                playsInline
                className={`absolute top-0 left-0 w-full h-full object-cover rounded-xl ${
                  isFrontCamera ? 'scale-x-[-1]' : ''
                }`}
              />
              
              {/* Camera Switch Button */}
              <button
                onClick={switchCamera}
                className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full 
                  transition-all transform hover:scale-105 md:hidden"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={1.5} 
                  stroke="currentColor" 
                  className="w-6 h-6"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" 
                  />
                </svg>
              </button>

              {/* Photo Number Indicator */}
              {isCapturing && (
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-bold z-10">
                  Photo {Math.min(Math.floor(photos.length) + 1, 4)} of 4
                </div>
              )}

              {/* Countdown Overlay */}
              {isCapturing && countdown !== null && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                  w-20 h-20 bg-white/80 rounded-full flex items-center justify-center z-20">
                  <span className="text-4xl font-bold text-black">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Flash Effect */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-30 animate-flash" />
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap justify-center gap-3 p-2">
            <button 
              onClick={startCamera}
              className="w-full md:w-auto px-6 py-3 bg-green-500 text-white rounded-full font-semibold 
                shadow-md hover:shadow-lg transition-all max-w-[160px] md:max-w-none"
            >
              Start Camera
            </button>
            <button 
              onClick={capturePhoto} 
              disabled={isCapturing}
              className={`w-full md:w-auto px-6 py-3 bg-blue-500 text-white rounded-full font-semibold 
                shadow-md hover:shadow-lg transition-all max-w-[160px] md:max-w-none
                ${isCapturing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isCapturing ? `Taking photo ${countdown ? countdown : '...'}` : 'Click Photo'}
            </button>
            {capturedPhoto && (
              <button 
                onClick={downloadPhoto}
                className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-full font-semibold 
                  shadow-md hover:shadow-lg transition-all max-w-[160px] md:max-w-none"
              >
                Download Photo
              </button>
            )}
          </div>
        </div>

        {/* Right side - Photos Section */}
        <div className="w-full md:w-80 bg-white rounded-3xl shadow-lg p-4 md:p-6 order-last md:order-none">
          <canvas id="photo-canvas" className="hidden" />
          {capturedPhoto ? (
            <img 
              src={capturedPhoto} 
              alt="Captured photos" 
              className="w-full rounded-2xl shadow-md hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="aspect-4/3 flex items-center justify-center text-gray-500 text-center p-6 
              bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
              Photos will appear here after capture
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
