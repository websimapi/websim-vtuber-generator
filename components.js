const { useState, useEffect, useRef, memo } = React;

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

        const headX = (nose.x - 0.5) * -150; // Inverted for more natural movement
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