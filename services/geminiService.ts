import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse, Part } from "@google/genai";
import type { IdPhotoOptions, BeautifyPhotoParams, InvitationGeneratorParams } from '../types';

const editModel = 'gemini-2.5-flash-image';
const proModel = 'gemini-3-pro-image-preview';

const getApiKey = (): string => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  if (storedKey) return storedKey;
  if (process.env.API_KEY) return process.env.API_KEY;
  throw new Error("Vui lòng nhập Gemini API Key trong phần Cài đặt.");
};

const fileToGenerativePart = (dataUrl: string): Part => {
  const [header, data] = dataUrl.split(',');
  if (!header || !data) throw new Error("Invalid data URL format");
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};

const performImageEdit = async (prompt: string, model: string, ...images: string[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const imageParts = images.map(fileToGenerativePart);
  const textPart: Part = { text: prompt };

  const contents = {
    parts: [...imageParts, textPart]
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData) {
      const base64ImageBytes = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;
      return `data:${mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("Không có ảnh nào được tạo. Mô hình có thể đã từ chối yêu cầu.");
};

export const editImageWithPrompt = (baseImage: string, prompt: string): Promise<string> => {
  const fullPrompt = `Bạn là chuyên gia chỉnh sửa ảnh AI. Hãy chỉnh sửa ảnh dựa trên hướng dẫn: "${prompt}". Giữ nguyên các phần không liên quan.`;
  return performImageEdit(fullPrompt, editModel, baseImage);
};

export const generateImageFromText = async (
  prompt: string,
  config: { aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3', numberOfImages: number, modelType?: 'flash' | 'pro' }
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const results: string[] = [];
  const modelToUse = config.modelType === 'pro' ? proModel : editModel;
  
  for (let i = 0; i < config.numberOfImages; i++) {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: config.aspectRatio },
      },
    });

    let found = false;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        results.push(`data:image/png;base64,${part.inlineData.data}`);
        found = true;
        break;
      }
    }
    if (!found) throw new Error("Không thể tạo ảnh từ mô tả này.");
  }
  
  return results;
};

export const generateImageFromSketch = (
    sketchImage: string, 
    userPrompt: string, 
    stylePrompt: string, 
    aspectRatio: '1:1' | '16:9' | '9:16',
    modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
    const prompt = `Biến bản phác thảo sau thành ảnh hoàn thiện. Phong cách: ${stylePrompt}. Mô tả: ${userPrompt}. Tỷ lệ: ${aspectRatio}.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, sketchImage);
};

export const editWithMask = (baseImage: string, maskImage: string, prompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const fullPrompt = `Chỉnh sửa vùng TRẮNG trên mặt nạ (mask) theo mô tả: "${prompt}". Giữ nguyên vùng ĐEN.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(fullPrompt, modelToUse, baseImage, maskImage);
};

export const changeBackground = (baseImage: string, backgroundPrompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Thay đổi nền ảnh thành: "${backgroundPrompt}". Giữ nguyên chủ thể và điều chỉnh ánh sáng cho phù hợp với nền mới.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const changeOutfitWithPrompt = (baseImage: string, outfitPrompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Thay đổi trang phục của người trong ảnh thành: "${outfitPrompt}". Giữ nguyên khuôn mặt, tư thế và phông nền.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const changeOutfitWithImage = (baseImage: string, outfitImages: string[], modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Mặc các trang phục từ các ảnh tham chiếu lên người trong ảnh đầu tiên. Giữ nguyên khuôn mặt và tư thế.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage, ...outfitImages);
};

export const restorePhoto = (baseImage: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = "Khôi phục và làm nét ảnh cũ này. Loại bỏ vết xước, nhiễu và cải thiện màu sắc.";
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const increaseResolution = (baseImage: string, resolution: 'Full HD' | '2K' | '4K' | '8K', modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Tăng độ phân giải ảnh lên mức ${resolution}. Làm nét chi tiết nhưng không thay đổi nội dung.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const expandImage = (canvasWithImage: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Mở rộng (outpaint) các vùng trống xung quanh ảnh một cách tự nhiên, giữ nguyên phong cách và bối cảnh.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, canvasWithImage);
};

export const changeStyle = (baseImage: string, stylePrompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Vẽ lại ảnh theo phong cách: "${stylePrompt}". Giữ nguyên bố cục.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const compositeImages = (images: string[], prompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const fullPrompt = `Ghép các ảnh lại với nhau theo mô tả: "${prompt}". Đảm bảo ánh sáng và tỷ lệ hài hòa.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(fullPrompt, modelToUse, ...images);
};

export const removeObject = (baseImage: string, maskImage: string): Promise<string> => {
    const prompt = `Xóa vật thể ở vùng trắng trên mặt nạ và lấp đầy nền một cách tự nhiên.`;
    return editWithMask(baseImage, maskImage, prompt);
};

export const replicatePose = (subjectImage: string, poseImage: string, userPrompt?: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const prompt = `Bạn là một chuyên gia chỉnh sửa ảnh AI. Bạn nhận được hai hình ảnh:
Hình ảnh 1 (Ảnh gốc): Chứa một người mà khuôn mặt, đặc điểm nhận dạng và phong cách cần được bảo tồn.
Hình ảnh 2 (Ảnh dáng): Chứa một người ở một tư thế cụ thể cần được sao chép.

Nhiệm vụ của bạn là tạo ra một hình ảnh mới, chân thực của người trong Hình ảnh 1, nhưng ở đúng tư thế của Hình ảnh 2.
${userPrompt ? `Yêu cầu bổ sung của người dùng: "${userPrompt}".` : ''}

HƯỚNG DẪN QUAN TRỌNG:
1. Bảo tồn danh tính: Khuôn mặt và các đặc điểm cơ bản của người trong Hình ảnh 1 PHẢI được duy trì chính xác.
2. Sao chép dáng: Tư thế cơ thể, vị trí chân tay và tư thế tổng thể từ Hình ảnh 2 phải được tái tạo chính xác.
3. Kết quả: Đầu ra phải là một hình ảnh duy nhất, chất lượng cao, trông tự nhiên.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, subjectImage, poseImage);
};

export const generateIdPhoto = (baseImage: string, options: IdPhotoOptions, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const backgroundColor = options.backgroundColor === 'Trắng' ? 'trắng' : 'xanh dương đậm';
    const prompt = `Tạo ảnh thẻ chuyên nghiệp. Nền: ${backgroundColor}. Kích thước: ${options.size}. ${options.outfitPrompt ? `Trang phục: ${options.outfitPrompt}.` : ''} ${options.hairDescription ? `Tóc: ${options.hairDescription}.` : ''} Làm mịn da và cân bằng ánh sáng.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, baseImage);
};

export const applyBeautification = (baseImage: string, params: BeautifyPhotoParams, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const prompt = `Làm đẹp ảnh chân dung: ${JSON.stringify(params.selections)}. Màu tóc: ${params.hairColor}. Trang điểm: ${params.makeupStyle}. Ánh sáng: ${params.lightingEffect}.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, baseImage);
};

export const generateConceptPhoto = (baseImage: string, conceptPrompt: string, size: '1:1' | '9:16' | '16:9', modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
    const prompt = `Tạo ảnh concept dựa trên chủ thể: "${conceptPrompt}". Tỷ lệ: ${size}.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, baseImage);
};

export const generateConsistentCharacterImage = (
    characterImages: string[],
    scenePrompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16',
    quality: 'Standard' | 'High',
    modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
    const prompt = `Tạo cảnh với nhân vật đồng nhất: "${scenePrompt}". Chất lượng: ${quality}. Tỷ lệ: ${aspectRatio}.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, ...characterImages);
};

export const extractAccessory = (baseImage: string, itemPrompt: string, modelType: 'flash' | 'pro' = 'flash'): Promise<string> => {
  const prompt = `Tách riêng vật phẩm "${itemPrompt}" ra khỏi ảnh và tạo thành ảnh sản phẩm trên nền trắng sạch sẽ.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, baseImage);
};

export const generatePoster = async (
  topic: string,
  slogan: string,
  posterType: 'Giáo dục' | 'Điện ảnh' | 'Tiếp thị',
  style: string,
  aspectRatio: '1:1' | '3:4' | '9:16' | '16:9',
  images: string[],
  mainImageIndex: number,
  styleImage: string | null,
  modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
    const prompt = `Thiết kế poster ${posterType}. Chủ đề: ${topic}. Khẩu hiệu: ${slogan}. Phong cách: ${style}. Tỷ lệ: ${aspectRatio}.`;
    const allImages = [...images];
    if (styleImage) allImages.push(styleImage);
    const modelToUse = modelType === 'pro' ? proModel : editModel;

    if (allImages.length > 0) {
        return performImageEdit(prompt, modelToUse, ...allImages);
    } else {
        const results = await generateImageFromText(prompt, { aspectRatio, numberOfImages: 1, modelType });
        return results[0];
    }
};

export const generateAffiliateImage = (
    modelImages: string[],
    products: { image: string, name: string }[],
    userPrompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16',
    quality: 'Standard' | 'High',
    imageType: 'Realistic' | 'Artistic',
    modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
    const prompt = `Tạo ảnh Affiliate: ${userPrompt}. Sản phẩm: ${products.map(p => p.name).join(', ')}. Tỷ lệ: ${aspectRatio}. LƯU Ý QUAN TRỌNG: Tuyệt đối KHÔNG được có bất kỳ chữ, văn bản, logo hay nhãn hiệu nào trong ảnh kết quả.`;
    const modelToUse = modelType === 'pro' ? proModel : editModel;
    return performImageEdit(prompt, modelToUse, ...modelImages, ...products.map(p => p.image));
};

export const generateProductBackgroundImage = (
  products: { image: string; name: string }[],
  backgroundPrompt: string,
  backgroundImage: string | null,
  aspectRatio: '1:1' | '16:9' | '9:16',
  quality: 'Standard' | 'High',
  imageType: 'Realistic' | 'Artistic',
  modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
  const prompt = `Thay nền sản phẩm: ${backgroundPrompt}. Tỷ lệ: ${aspectRatio}.`;
  const allImages = products.map(p => p.image);
  if (backgroundImage) allImages.push(backgroundImage);
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, ...allImages);
};

export const generateExplodedView = (
  productImage: string,
  aspectRatio: '1:1' | '16:9' | '9:16',
  quality: 'Standard' | 'High',
  imageType: 'Realistic' | 'Artistic',
  modelType: 'flash' | 'pro' = 'flash'
): Promise<string> => {
  const prompt = `Tạo ảnh tách lớp (exploded view) cho sản phẩm này. Tỷ lệ: ${aspectRatio}.`;
  const modelToUse = modelType === 'pro' ? proModel : editModel;
  return performImageEdit(prompt, modelToUse, productImage);
};

export const generateInvitationImage = async (params: InvitationGeneratorParams): Promise<string[]> => {
  const { unit, type, content, time, location, wishes, additionalInfo, aspectRatio, numberOfImages, modelType } = params;
  
  const prompt = `Bạn là chuyên gia thiết kế đồ họa cao cấp. Hãy thiết kế mẫu ${type} đẹp mắt, chuyên nghiệp.
Yêu cầu QUAN TRỌNG về trình bày văn bản (BẮT BUỘC thực hiện đúng):
1. Dòng trên cùng: "${unit}" (Tuyệt đối KHÔNG kèm chữ "Đơn vị" hay bất kỳ nhãn nào phía trước).
2. Tiêu đề (Nằm dưới tên đơn vị, trang trọng, kích thước lớn): "${type.toUpperCase()}".
3. TRÌNH BÀY NỘI DUNG VĂN BẢN (Tuyệt đối KHÔNG tự thêm các nhãn hệ thống KHÁC NGOÀI "Thời gian:" và "Địa điểm:"):
   - "${content}"
   - ${time ? `"Thời gian: ${time}"` : ""}
   - ${location ? `"Địa điểm: ${location}"` : ""}
   - "${wishes}"
4. Yêu cầu thiết kế riêng từ người dùng: "${additionalInfo || 'Không có'}".
5. Bố cục: Cân đối, hiện đại, phông chữ tiếng Việt đẹp, dễ đọc.
6. Tỷ lệ: ${aspectRatio}.
Kết quả cuối cùng là hình ảnh thiết kế đồ họa hoàn chỉnh với đúng nội dung chữ tiếng Việt như trên.`;

  return generateImageFromText(prompt, { aspectRatio, numberOfImages, modelType });
};

export const suggestSlogans = async (topic: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Gợi ý 3 câu khẩu hiệu ngắn gọn cho poster về "${topic}" bằng tiếng Việt. Trả về JSON.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    slogans: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text).slogans || [];
    } catch {
        return [];
    }
};

export const suggestPrompts = async (
    context: string,
    image?: string | null,
    currentText?: string | null,
): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const parts: Part[] = [];
    if (image) parts.push(fileToGenerativePart(image));
    parts.push({ text: `Gợi ý 3 mô tả sáng tạo bằng tiếng Việt cho ngữ cảnh: ${context}. Ý tưởng hiện tại: ${currentText || 'Chưa có'}. Trả về JSON.` });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text).prompts || [];
    } catch {
        return [];
    }
};

export const suggestProductBackgrounds = async (productImage: string, productName: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const parts = [
        fileToGenerativePart(productImage),
        { text: `Gợi ý 3 ý tưởng nền cho sản phẩm "${productName}" bằng tiếng Việt. Trả về JSON.` }
    ];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text).suggestions || [];
    } catch {
        return [];
    }
};