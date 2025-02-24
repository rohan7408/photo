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

  const containerStyle = {
    padding: '30px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)',
    minHeight: '100vh'
  };

  const mainContentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    gap: '30px',
    position: 'relative'
  };

  const cameraSectionStyle = {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '30px',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)'
  };

  const filterContainerStyle = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '20px',
    marginBottom: '5px'
  };

  const cameraContainerStyle = {
    width: '100%',
    borderRadius: '25px',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
    padding: '15px'
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    padding: '10px'
  };

  const photosSectionStyle = {
    width: '320px',
    backgroundColor: 'white',
    borderRadius: '30px',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: 'fit-content',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)'
  };

  const buttonStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)'
    },
    ':disabled': {
      opacity: 0.7,
      cursor: 'not-allowed',
      transform: 'none'
    }
  };

  const filterButtonStyle = {
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '15px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)'
    }
  };

  return (
    <div style={containerStyle}>
      <div style={mainContentStyle}>
        {/* Left side - Camera Section */}
        <div style={cameraSectionStyle}>
          {/* Filter Selection */}
          <div style={filterContainerStyle}>
            <button 
              onClick={() => setSelectedFilter('normal')}
              style={{
                ...filterButtonStyle,
                backgroundColor: selectedFilter === 'normal' ? '#4CAF50' : '#95a5a6'
              }}
            >
              Normal
            </button>
            <button 
              onClick={() => setSelectedFilter('bw')}
              style={{
                ...filterButtonStyle,
                backgroundColor: selectedFilter === 'bw' ? '#2c3e50' : '#95a5a6'
              }}
            >
              B&W
            </button>
            <button 
              onClick={() => setSelectedFilter('retro')}
              style={{
                ...filterButtonStyle,
                backgroundColor: selectedFilter === 'retro' ? '#e67e22' : '#95a5a6'
              }}
            >
              Retro
            </button>
          </div>

          <div style={cameraContainerStyle}>
            <div style={{
              position: 'relative',
              width: '100%',
              paddingTop: '75%',
              backgroundColor: '#edf2f7',
              borderRadius: '20px',
            }}>
              <video
                id="camera-stream"
                autoPlay
                playsInline
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '15px',
                  objectFit: 'cover'
                }}
              />
              {/* Photo Number Indicator */}
              {isCapturing && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  zIndex: 10
                }}>
                  Photo {Math.min(Math.floor(photos.length) + 1, 4)} of 4
                </div>
              )}
              {/* Countdown or Message Overlay */}
              {isCapturing && (countdown !== null || message) && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '20px',
                  borderRadius: message ? '15px' : '50%',
                  width: message ? 'auto' : '150px',
                  height: message ? 'auto' : '150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  animation: countdown !== null ? 'pulse 1s infinite' : 'none',
                  fontSize: message ? '24px' : '72px',
                  fontWeight: 'bold',
                  minWidth: message ? '200px' : 'auto'
                }}>
                  {message || countdown}
                </div>
              )}
            </div>
          </div>

          <div style={buttonContainerStyle}>
            <button 
              onClick={startCamera}
              style={{
                ...buttonStyle,
                backgroundColor: '#4CAF50'
              }}
            >
              Start Camera
            </button>
            <button 
              onClick={capturePhoto} 
              disabled={isCapturing}
              style={{
                ...buttonStyle,
                backgroundColor: '#2196F3'
              }}
            >
              {isCapturing ? `Taking photo ${countdown ? countdown : '...'}` : 'Click Photo'}
            </button>
            {capturedPhoto && (
              <button 
                onClick={downloadPhoto}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#9C27B0'
                }}
              >
                Download Photo
              </button>
            )}
          </div>
        </div>

        {/* Right side - Photos Section */}
        <div style={photosSectionStyle}>
          <canvas id="photo-canvas" style={{ display: 'none' }} />
          {capturedPhoto ? (
            <img 
              src={capturedPhoto} 
              alt="Captured photos" 
              style={{ 
                width: '100%',
                borderRadius: '15px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.3s ease',
                ':hover': {
                  transform: 'scale(1.02)'
                }
              }}
            />
          ) : (
            <div style={{
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '16px',
              textAlign: 'center',
              padding: '25px',
              backgroundColor: '#f8f9fa',
              borderRadius: '15px',
              border: '2px dashed #cbd5e1'
            }}>
              Photos will appear here after capture
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
