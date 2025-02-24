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
  const [message, setMessage] = React.useState(null);
  const [photos, setPhotos] = React.useState([]);
  const [selectedFilter, setSelectedFilter] = React.useState('normal');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoElement = document.getElementById('camera-stream');
      videoElement.srcObject = stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

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
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
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
      // Show which photo is being taken
      setMessage(`Get ready for photo ${i + 1} of 4`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Show message for 2 seconds
      
      // Countdown
      setMessage(null);
      setCountdown(3);
      for (let j = 3; j > 0; j--) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCountdown(j - 1);
      }

      const photo = takePhoto(video, canvas);
      newPhotos.push(photo);
      setPhotos([...newPhotos]); // Update photos array after each capture
      
      // Wait between photos
      if (i < 3) {
        setMessage('Great! Next photo coming up...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Combine all photos
    setMessage('Processing your photos...');
    const combinedPhoto = await combinePhotos(newPhotos);
    setCapturedPhoto(combinedPhoto);
    setIsCapturing(false);
    setCountdown(null);
    setMessage(null);
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
            <div className="relative w-full pt-[100%] md:pt-[75%] bg-gray-100 rounded-2xl overflow-hidden max-w-xl mx-auto">
              <video
                id="camera-stream"
                autoPlay
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover rounded-xl"
              />
              {/* Photo Number Indicator */}
              {isCapturing && (
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-bold z-10">
                  Photo {Math.min(Math.floor(photos.length) + 1, 4)} of 4
                </div>
              )}
              {/* Countdown or Message Overlay */}
              {isCapturing && (countdown !== null || message) && (
                <div className={`absolute 
                  ${message 
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70' // Keep message with background
                    : 'top-4 right-4' // Countdown in top right without background
                  }
                  text-white flex items-center justify-center
                  ${message 
                    ? 'rounded-2xl px-4 py-3 min-w-[160px] md:min-w-[300px]' 
                    : 'w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32'
                  }`}>
                  <div className="flex items-center justify-center w-full h-full">
                    <span className={`
                      ${message 
                        ? 'text-xs sm:text-sm md:text-base font-semibold'
                        : 'text-3xl sm:text-5xl md:text-7xl font-bold animate-pulse leading-none text-black'
                      }
                    `}>
                      {message || countdown}
                    </span>
                  </div>
                </div>
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
