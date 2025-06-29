const { useState, useEffect, useRef, memo } = React;
const room = new WebsimSocket();

// Utility function to get anchor type color
const getAnchorTypeColor = (type) => {
    const colors = {
        left_eye: '#ff6b6b',
        right_eye: '#ff4757',
        mouth: '#ff3838',
        left_shoulder: '#45b7d1',
        right_shoulder: '#3c6382'
    };
    return colors[type] || '#333';
};

const Header = memo(() => (
    <header className="header">
        <h1>🎭 VTuber Generator</h1>
        <p>Create your perfect virtual character with AI</p>
    </header>
));

const GeneratorInput = memo(({ prompt, setPrompt, generateVTuber, isGenerating }) => {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateVTuber();
        }
    };

    return (
        <div className="generator-section">
            <div className="input-container">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your VTuber... (e.g., 'cat girl with blue hair and magical powers')"
                    className="prompt-input"
                    rows="3"
                />
                <button
                    onClick={generateVTuber}
                    disabled={!prompt.trim() || isGenerating}
                    className="generate-btn"
                >
                    {isGenerating ? (
                        <>
                            <span className="spinner"></span>
                            Generating...
                        </>
                    ) : (
                        '✨ Generate VTuber'
                    )}
                </button>
            </div>
        </div>
    );
});

const VTuberCard = memo(({ vtuber, isSelected, onSelect, onLike, onEdit, currentUser }) => (
    <div
        className={`vtuber-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(vtuber)}
    >
        <div className="vtuber-image-container">
            <img
                src={vtuber.imageUrl}
                alt={vtuber.name}
                className="vtuber-image"
            />
            {vtuber.anchorPoints && vtuber.anchorPoints.length > 0 && (
                <div className="anchor-points-preview">
                    {vtuber.anchorPoints.map((point) => (
                        <div
                            key={point.id}
                            className="anchor-point-preview"
                            style={{
                                left: `${point.x}%`,
                                top: `${point.y}%`,
                                backgroundColor: getAnchorTypeColor(point.type)
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
        <div className="vtuber-info">
            <h3>{vtuber.name}</h3>
            <p className="vtuber-prompt">"{vtuber.prompt}"</p>
            <div className="vtuber-meta">
                <span className="creator">by {vtuber.username}</span>
                <div className="vtuber-actions">
                    {currentUser && currentUser.username === vtuber.username && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(vtuber);
                            }}
                            className="edit-btn"
                        >
                            ✏️ Edit
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLike(vtuber);
                        }}
                        className="like-btn"
                    >
                        ❤️ {vtuber.likes}
                    </button>
                </div>
            </div>
        </div>
    </div>
));

const VTuberGallery = memo(({ vtubers, selectedVTuber, onSelect, onLike, onEdit, currentUser }) => (
    <div className="gallery-section">
        <h2>VTuber Gallery</h2>
        <div className="vtuber-grid">
            {vtubers.slice().reverse().map((vtuber) => (
                <VTuberCard
                    key={vtuber.id}
                    vtuber={vtuber}
                    isSelected={selectedVTuber?.id === vtuber.id}
                    onSelect={onSelect}
                    onLike={onLike}
                    onEdit={onEdit}
                    currentUser={currentUser}
                />
            ))}
        </div>
        {vtubers.length === 0 && (
            <div className="empty-state">
                <p>No VTubers yet! Be the first to create one! 🌟</p>
            </div>
        )}
    </div>
));

const CameraSection = memo(({ isCameraActive, setIsCameraActive, trackingData, videoRef, canvasRef }) => (
    <div className="camera-section">
        <h2>🎥 Live Animation</h2>
        <div className="camera-controls">
            <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`camera-btn ${isCameraActive ? 'active' : ''}`}
            >
                {isCameraActive ? '🔴 Stop Camera' : '📹 Start Camera'}
            </button>
            <div className="camera-status">
                {isCameraActive ? (
                    trackingData?.faceLandmarks ?
                        '✅ Face tracking active' :
                        '⏳ Initializing tracking...'
                ) : (
                    '⚫ Camera off'
                )}
            </div>
        </div>

        {isCameraActive && (
            <div className="camera-container">
                <div className="video-container">
                    <video
                        ref={videoRef}
                        className="video-feed"
                        autoPlay
                        muted
                        playsInline
                    />
                    <canvas
                        ref={canvasRef}
                        className="tracking-overlay"
                    />
                </div>
            </div>
        )}
    </div>
));

const SelectedVTuberDisplay = memo(({ vtuber, trackingData }) => {
    const getVTuberTransform = () => {
        if (!trackingData || !trackingData.faceLandmarks || !vtuber?.anchorPoints) {
            return {};
        }

        const face = trackingData.faceLandmarks;
        if (face.length === 0) return {};

        const nose = face[1]; // Nose tip
        const leftEye = face[33];
        const rightEye = face[263];

        if (!nose || !leftEye || !rightEye) return {};

        const tiltAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
        const significantTilt = Math.abs(tiltAngle) > 5 ? tiltAngle * 0.3 : 0;

        const headX = (nose.x - 0.5) * 150;
        const headY = (nose.y - 0.5) * 100;

        let mouthScaleY = 1;
        if (face[13] && face[14]) { // Upper and lower lip landmarks
            const upperLip = face[13];
            const lowerLip = face[14];
            const mouthOpenness = Math.abs(upperLip.y - lowerLip.y);
            mouthScaleY = 1.0 + (mouthOpenness * 8);
            mouthScaleY = Math.max(1.0, Math.min(1.4, mouthScaleY));
        }

        return {
            transform: `translate(${headX}px, ${headY}px) rotate(${significantTilt}deg)`,
            filter: trackingData.poseLandmarks ? 'none' : 'grayscale(50%)',
            mouthScale: mouthScaleY
        };
    };

    const transformStyle = getVTuberTransform();
    const mouthAnchor = vtuber.anchorPoints?.find(p => p.type === 'mouth');

    return (
        <div className="selected-vtuber-container">
            <div className="vtuber-display" style={transformStyle}>
                <img
                    src={vtuber.imageUrl}
                    alt={vtuber.name}
                    className="display-image"
                />
                {mouthAnchor && (
                    <div
                        className="mouth-overlay"
                        style={{
                            transform: `scaleY(${transformStyle.mouthScale || 1})`,
                            clipPath: `circle(3% at ${mouthAnchor.x}% ${mouthAnchor.y}%)`
                        }}
                    >
                        <img
                            src={vtuber.imageUrl}
                            alt={vtuber.name}
                            className="mouth-image"
                        />
                    </div>
                )}
                <div className="vtuber-name-badge">
                    {vtuber.name}
                </div>
            </div>
        </div>
    );
});

const EditModal = memo(({ vtuber, onSave, onClose }) => {
    const [anchorPoints, setAnchorPoints] = useState(vtuber.anchorPoints || []);

    const addAnchorPoint = (e, type) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newPoint = {
            id: Date.now(),
            x: x,
            y: y,
            type: type,
            label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };

        setAnchorPoints(prevPoints => [...prevPoints.filter(p => p.type !== type), newPoint]);
    };

    const removeAnchorPoint = (pointId) => {
        setAnchorPoints(anchorPoints.filter(p => p.id !== pointId));
    };

    const handleSave = () => {
        onSave(vtuber.id, anchorPoints);
    };

    return (
        <div className="edit-modal">
            <div className="edit-modal-content">
                <div className="edit-header">
                    <h2>Add Anchor Points - {vtuber.name}</h2>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>

                <div className="edit-instructions">
                    <p>Click on the image to add anchor points for animation tracking. Click existing points to remove them:</p>
                    <div className="anchor-types">
                        {['left_eye', 'right_eye', 'mouth', 'left_shoulder', 'right_shoulder'].map((type, index) => (
                             <label key={type}>
                                <input type="radio" name="anchorType" value={type} defaultChecked={index === 0} />
                                <span style={{color: getAnchorTypeColor(type)}}>● {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="edit-image-container">
                    <img
                        src={vtuber.imageUrl}
                        alt={vtuber.name}
                        className="edit-image"
                        onClick={(e) => {
                            const selectedType = document.querySelector('input[name="anchorType"]:checked').value;
                            addAnchorPoint(e, selectedType);
                        }}
                    />
                    <div className="anchor-points-overlay">
                        {anchorPoints.map((point) => (
                            <div
                                key={point.id}
                                className="anchor-point"
                                style={{
                                    left: `${point.x}%`,
                                    top: `${point.y}%`,
                                    backgroundColor: getAnchorTypeColor(point.type)
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAnchorPoint(point.id);
                                }}
                                title={`${point.label} (click to remove)`}
                            >
                                <span className="anchor-label">{point.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="edit-actions">
                    <button onClick={onClose} className="cancel-btn">Cancel</button>
                    <button onClick={handleSave} className="save-btn">
                        Save Anchor Points ({anchorPoints.length})
                    </button>
                </div>
            </div>
        </div>
    );
});

function App() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVTuber, setSelectedVTuber] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingVTuber, setEditingVTuber] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [trackingData, setTrackingData] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const holisticRef = useRef(null);
    const cameraRef = useRef(null);

    const vtubers = React.useSyncExternalStore(
        room.collection('vtuber_v2').subscribe,
        room.collection('vtuber_v2').getList
    );

    useEffect(() => {
        window.websim.getCurrentUser().then(setCurrentUser);
    }, []);
    
    useEffect(() => {
        if (isCameraActive) {
            initializeCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isCameraActive]);

    const drawLandmarks = (ctx, landmarks, color, size) => {
        ctx.fillStyle = color;
        landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, size, 0, 2 * Math.PI);
            ctx.fill();
        });
    };

    const onHolisticResults = (results) => {
        setTrackingData(results);

        if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            if (results.faceLandmarks) drawLandmarks(ctx, results.faceLandmarks, '#ff6b6b', 2);
            if (results.poseLandmarks) drawLandmarks(ctx, results.poseLandmarks, '#45b7d1', 4);
        }
    };

    const initializeCamera = async () => {
        if (!videoRef.current) return;
        try {
            const holistic = new Holistic({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
            });
            holistic.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: true,
                refineFaceLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            holistic.onResults(onHolisticResults);
            holisticRef.current = holistic;

            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (holisticRef.current && videoRef.current) {
                        await holisticRef.current.send({ image: videoRef.current });
                    }
                },
                width: 640,
                height: 480
            });
            cameraRef.current = camera;
            await camera.start();
        } catch (error) {
            console.error('Error initializing camera:', error);
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        if (holisticRef.current) {
            holisticRef.current.close();
            holisticRef.current = null;
        }
    };
    
    const generateVTuberName = (prompt) => {
        const prefixes = ['Luna', 'Kira', 'Yuki', 'Hana', 'Sora', 'Miku', 'Rika', 'Neko', 'Yui', 'Aoi'];
        const suffixes = ['chan', 'kun', 'san', 'tan'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${randomPrefix}-${randomSuffix}`;
    };

    const generateVTuber = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        try {
            const result = await websim.imageGen({
                prompt: `VTuber character design: ${prompt}, anime style, cute, expressive, colorful, high quality digital art`,
                transparent: true,
                aspect_ratio: "3:4"
            });
            const response = await fetch(result.url);
            const blob = await response.blob();
            const file = new File([blob], 'vtuber.png', { type: 'image/png' });
            const permanentUrl = await websim.upload(file);
            const vtuber = await room.collection('vtuber_v2').create({
                name: generateVTuberName(prompt),
                prompt: prompt,
                imageUrl: permanentUrl,
                likes: 0,
                anchorPoints: []
            });
            setSelectedVTuber(vtuber);
            setPrompt('');
        } catch (error) {
            console.error('Error generating VTuber:', error);
            alert('Failed to generate VTuber. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const likeVTuber = async (vtuber) => {
        if (!currentUser) return;
        try {
            await room.collection('vtuber_v2').update(vtuber.id, {
                likes: vtuber.likes + 1
            });
        } catch (error) {
            console.error('Error liking VTuber:', error);
        }
    };
    
    const saveAnchorPoints = async (vtuberId, anchorPoints) => {
        try {
            await room.collection('vtuber_v2').update(vtuberId, { anchorPoints });
            setEditingVTuber(null);
            // After saving, we might need to update the selectedVTuber state if it's the one being edited
            if(selectedVTuber && selectedVTuber.id === vtuberId) {
                const updatedVTuber = vtubers.find(v => v.id === vtuberId);
                if (updatedVTuber) {
                    setSelectedVTuber({ ...updatedVTuber, anchorPoints });
                }
            }
        } catch (error) {
            console.error('Error saving anchor points:', error);
            alert('Failed to save anchor points. Please try again.');
        }
    };

    return (
        <div className="app">
            <Header />

            <GeneratorInput
                prompt={prompt}
                setPrompt={setPrompt}
                generateVTuber={generateVTuber}
                isGenerating={isGenerating}
            />

            <VTuberGallery
                vtubers={vtubers}
                selectedVTuber={selectedVTuber}
                onSelect={setSelectedVTuber}
                onLike={likeVTuber}
                onEdit={setEditingVTuber}
                currentUser={currentUser}
            />
            
            {selectedVTuber && (
                 <CameraSection
                    isCameraActive={isCameraActive}
                    setIsCameraActive={setIsCameraActive}
                    trackingData={trackingData}
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                />
            )}

            {selectedVTuber && isCameraActive && (
                <SelectedVTuberDisplay vtuber={selectedVTuber} trackingData={trackingData} />
            )}

            {editingVTuber && (
                <EditModal
                    vtuber={editingVTuber}
                    onSave={saveAnchorPoints}
                    onClose={() => setEditingVTuber(null)}
                />
            )}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));