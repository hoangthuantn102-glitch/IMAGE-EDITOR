import React, { useState, useEffect } from 'react';
import { Feature, Session } from './types';
import { FEATURES } from './constants';
import Header from './components/Header';
import BackgroundChanger from './components/features/BackgroundChanger';
import OutfitChanger from './components/features/OutfitChanger';
import PhotoRestorer from './components/features/PhotoRestorer';
import ImageExpander from './components/features/ImageExpander';
import StyleChanger from './components/features/StyleChanger';
import ImageCompositor from './components/features/ImageCompositor';
import IdPhotoGenerator from './components/features/IdPhotoGenerator';
import PhotoBeautifier from './components/features/PhotoBeautifier';
import ConceptGenerator from './components/features/ConceptGenerator';
import GenerateFromIdea from './components/features/GenerateFromIdea';
import PoseReplicator from './components/features/PoseReplicator';
import IncreaseResolution from './components/features/IncreaseResolution';
import ConsistentCharacterGenerator from './components/features/ConsistentCharacterGenerator';
import AccessoryExtractor from './components/features/AccessoryExtractor';
import PosterGenerator from './components/features/PosterGenerator';
import AffiliateImageGenerator from './components/features/AffiliateImageGenerator';
import InvitationGenerator from './components/features/InvitationGenerator';
import StoryGenerator from './components/features/StoryGenerator';
import HistoryPanel from './components/HistoryPanel';
import { useHistory } from './hooks/useHistory';
import ImageZoomModal from './components/ImageZoomModal';

const featureComponentMap = {
  [Feature.GenerateFromIdea]: GenerateFromIdea,
  [Feature.GeneratePoster]: PosterGenerator,
  [Feature.GenerateAffiliateImage]: AffiliateImageGenerator,
  [Feature.GenerateInvitation]: InvitationGenerator,
  [Feature.GenerateStoryImages]: StoryGenerator,
  [Feature.GenerateConsistentCharacter]: ConsistentCharacterGenerator,
  [Feature.ExtractAccessory]: AccessoryExtractor,
  [Feature.ChangeBackground]: BackgroundChanger,
  [Feature.ChangeOutfit]: OutfitChanger,
  [Feature.ReplicatePose]: PoseReplicator,
  [Feature.RestorePhoto]: PhotoRestorer,
  [Feature.IncreaseResolution]: IncreaseResolution,
  [Feature.ExpandImage]: ImageExpander,
  [Feature.ChangeStyle]: StyleChanger,
  [Feature.CompositeImages]: ImageCompositor,
  [Feature.GenerateIdPhoto]: IdPhotoGenerator,
  [Feature.BeautifyPhoto]: PhotoBeautifier,
  [Feature.GenerateConceptPhoto]: ConceptGenerator,
};

const App: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const { sessions, saveSession, deleteSession } = useHistory();
  const [sessionToLoad, setSessionToLoad] = useState<Session | null>(null);
  const [imageToLoad, setImageToLoad] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleLoadSession = (session: Session) => {
    setSessionToLoad(session);
    setSelectedFeature(session.featureId);
    setImageToLoad(null); // Clear image to load when loading session
    setIsHistoryPanelOpen(false);
  };
  
  const handleSendImage = (image: string, featureId: Feature) => {
    setImageToLoad(image);
    setSelectedFeature(featureId);
    setSessionToLoad(null); // Clear session loading
  };

  const handleHomeClick = () => {
    setSelectedFeature(null);
    setSessionToLoad(null);
    setImageToLoad(null);
  };

  // Clear sessionToLoad/imageToLoad after it has been passed to a component
  useEffect(() => {
    if (sessionToLoad || imageToLoad) {
      const timer = setTimeout(() => {
        setSessionToLoad(null);
        setImageToLoad(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sessionToLoad, imageToLoad, selectedFeature]);

  useEffect(() => {
    const handleZoomRequest = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setZoomedImage(customEvent.detail);
      }
    };

    window.addEventListener('imageZoomRequest', handleZoomRequest);

    return () => {
      window.removeEventListener('imageZoomRequest', handleZoomRequest);
    };
  }, []);


  const renderFeature = () => {
    if (!selectedFeature) return null;
    const FeatureComponent = featureComponentMap[selectedFeature];
    if (!FeatureComponent) return null;

    const featureInfo = FEATURES.find(f => f.id === selectedFeature);

    const handleSaveSession = (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => {
        if (!featureInfo) return;
        saveSession({ 
            ...sessionData, 
            featureId: selectedFeature,
            featureTitle: featureInfo.title 
        });
    };

    return <FeatureComponent 
        sessionToLoad={sessionToLoad} 
        onSaveSession={handleSaveSession}
        imageToLoad={imageToLoad}
        onSendImage={handleSendImage}
    />;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans">
      <Header onHomeClick={handleHomeClick} onHistoryClick={() => setIsHistoryPanelOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        {selectedFeature === null ? (
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
              AI Image Editor Pro
            </h1>
            <p className="text-center text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Select a powerful AI tool to transform your images. Powered by Google Gemini.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-slate-800/50 rounded-lg p-6 flex flex-col items-start cursor-pointer transition-all duration-300 hover:bg-slate-700/70 hover:scale-105 border border-slate-700"
                  onClick={() => setSelectedFeature(feature.id)}
                >
                  <div className="mb-4 text-purple-400">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400 flex-grow">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleHomeClick}
              className="mb-6 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to Features
            </button>
            {renderFeature()}
          </div>
        )}
      </main>
       <footer className="text-center py-4 text-slate-500 text-sm">
        <p>Built with React, TypeScript, and the Gemini API.</p>
      </footer>
      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
      />
       <div className="fixed bottom-0 left-0 w-full bg-black/60 text-white text-sm p-1 z-[60] overflow-hidden whitespace-nowrap backdrop-blur-sm">
        <span className="animate-marquee">
          Bản quyền: Bùi Hoàng Thuấn 0343885383. Phường Bách Quang, Thái Nguyên
        </span>
      </div>
      <ImageZoomModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};

export default App;