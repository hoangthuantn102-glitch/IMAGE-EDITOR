export enum Feature {
  ChangeBackground = 'CHANGE_BACKGROUND',
  ChangeOutfit = 'CHANGE_OUTFIT',
  RestorePhoto = 'RESTORE_PHOTO',
  ExpandImage = 'EXPAND_IMAGE',
  ChangeStyle = 'CHANGE_STYLE',
  CompositeImages = 'COMPOSITE_IMAGES',
  GenerateIdPhoto = 'GENERATE_ID_PHOTO',
  BeautifyPhoto = 'BEAUTIFY_PHOTO',
  GenerateConceptPhoto = 'GENERATE_CONCEPT_PHOTO',
  GenerateFromIdea = 'GENERATE_FROM_IDEA',
  ReplicatePose = 'REPLICATE_POSE',
  IncreaseResolution = 'INCREASE_RESOLUTION',
  GenerateConsistentCharacter = 'GENERATE_CONSISTENT_CHARACTER',
  ExtractAccessory = 'EXTRACT_ACCESSORY',
  GeneratePoster = 'GENERATE_POSTER',
  GenerateAffiliateImage = 'GENERATE_AFFILIATE_IMAGE',
  GenerateInvitation = 'GENERATE_INVITATION',
  GenerateStoryImages = 'GENERATE_STORY_IMAGES',
}

export interface OutfitChangeOptions {
  type: 'prompt' | 'image';
  promptValue: string;
  imageValue: string[];
}

export interface IdPhotoOptions {
    size: string;
    backgroundColor: 'Trắng' | 'Xanh';
    outfitChangeType: 'none' | 'prompt' | 'image';
    outfitPrompt: string;
    outfitImage: string | null;
    hairDescription: string;
    removeBlemishes: boolean;
    autoAdjustLighting: boolean;
    autoAdjustFace: boolean;
}

export interface ConceptPhotoOptions {
  numberOfImages: number;
  size: '1:1' | '9:16' | '16:9';
}

export interface GenerateFromIdeaOptions {
  inputType: 'prompt' | 'sketch';
  prompt: string;
  sketchImage: string | null;
  outputType: 'photo' | 'drawing';
  drawingStyle: 'pencil' | 'ink' | 'none' | 'blue_ballpoint' | 'red_ballpoint';
  aspectRatio: '1:1' | '16:9' | '9:16';
  numberOfImages: number;
}


// New types for session history
export interface BackgroundChangerParams {
  prompt: string;
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface OutfitChangerParams {
  options: OutfitChangeOptions;
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface RestorePhotoParams {
  modelType?: 'flash' | 'pro';
}

export interface IncreaseResolutionParams {
  resolution: 'Full HD' | '2K' | '4K' | '8K';
  modelType?: 'flash' | 'pro';
}

export interface ExpandImageParams {
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface StyleChangerParams {
  movement: string;
  material: string;
  illustrativeStyle: string;
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface CompositeImagesParams {
  prompt: string;
  numberOfImages: number;
  additionalImages: string[];
  modelType?: 'flash' | 'pro';
}

export interface IdPhotoGeneratorParams {
  options: IdPhotoOptions;
  modelType?: 'flash' | 'pro';
}

export interface BeautifyPhotoParams {
  selections: Record<string, boolean>;
  hairColor?: string;
  makeupStyle?: string;
  lightingEffect?: string;
  lightDirection?: string;
  shootingAngle?: string;
  modelType?: 'flash' | 'pro';
}

export interface ConceptGeneratorParams {
  prompt: string;
  options: ConceptPhotoOptions;
  modelType?: 'flash' | 'pro';
}

export interface GenerateFromIdeaParams {
  options: GenerateFromIdeaOptions;
  modelType?: 'flash' | 'pro';
}

export interface ReplicatePoseParams {
  poseImage?: string; // Kept for backwards compatibility with old sessions
  poseImages?: string[];
  numberOfImages: number;
  prompt?: string;
  modelType?: 'flash' | 'pro';
}

export interface ConsistentCharacterParams {
  prompt: string;
  characterImages: string[];
  aspectRatio: '1:1' | '16:9' | '9:16';
  quality: 'Standard' | 'High';
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface ExtractAccessoryParams {
  prompt: string;
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface PosterGeneratorParams {
  topic: string;
  slogan: string;
  posterType: 'Giáo dục' | 'Điện ảnh' | 'Tiếp thị';
  style: 'Hiện đại' | 'Cổ điển' | 'Tối giản' | 'Năng động' | 'Nghệ thuật' | 'Dễ thương' | 'Ảnh mẫu';
  styleImage?: string | null;
  aspectRatio: '1:1' | '3:4' | '9:16' | '16:9';
  images: string[];
  mainImageIndex: number;
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface AffiliateImageGeneratorParams {
  mode: 'kol' | 'product' | 'exploded' | 'kol_batch';
  prompt: string;
  modelImages: string[];
  products: { image: string; name: string }[];
  backgroundImage?: string | null;
  aspectRatio: '1:1' | '16:9' | '9:16';
  quality: 'Standard' | 'High';
  numberOfImages: number;
  imageType: 'Realistic' | 'Artistic';
  modelType?: 'flash' | 'pro';
}

export interface InvitationGeneratorParams {
  unit: string;
  type: string;
  content: string;
  time: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location: string;
  wishes: string;
  additionalInfo?: string;
  aspectRatio: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
  numberOfImages: number;
  modelType?: 'flash' | 'pro';
}

export interface StoryGeneratorParams {
  story: string;
  referenceImages: { image: string; name: string }[];
  aspectRatio: '1:1' | '16:9' | '9:16';
  quality: 'Standard' | 'High';
  modelType?: 'flash' | 'pro';
}

export type FeatureParams =
  | BackgroundChangerParams
  | OutfitChangerParams
  | RestorePhotoParams
  | ExpandImageParams
  | StyleChangerParams
  | CompositeImagesParams
  | IdPhotoGeneratorParams
  | BeautifyPhotoParams
  | ConceptGeneratorParams
  | GenerateFromIdeaParams
  | ReplicatePoseParams
  | IncreaseResolutionParams
  | ConsistentCharacterParams
  | ExtractAccessoryParams
  | PosterGeneratorParams
  | AffiliateImageGeneratorParams
  | InvitationGeneratorParams
  | StoryGeneratorParams;


export interface Session {
  id: number; // using timestamp for simplicity
  featureId: Feature;
  featureTitle: string;
  originalImage: string | string[];
  resultImages: string[];
  parameters: FeatureParams;
  timestamp: string; // ISO string
}