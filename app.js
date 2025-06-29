const { useState, useEffect, useRef, memo } = React;
const room = new WebsimSocket();

function App() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedVTuber, setSelectedVTuber] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingVTuber, setEditingVTuber] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    
    const vtubers = React.useSyncExternalStore(
        room.collection('vtuber_v2').subscribe,
        room.collection('vtuber_v2').getList
    );
    
    const { trackingData, videoRef, canvasRef } = useHolistic(isCameraActive);

    useEffect(() => {
        window.websim.getCurrentUser().then(setCurrentUser);
    }, []);
    
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