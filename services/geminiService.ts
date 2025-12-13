import { GoogleGenAI, Type } from "@google/genai";
import { SongConcept } from "../types";

// Helper to get initialized client with current key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSongConcept = async (
  genre: string,
  mood: string,
  topic: string
): Promise<SongConcept> => {
  // Initialize client at call time to ensure API_KEY is present
  const ai = getAiClient();
  const model = "gemini-2.5-flash"; // Using 2.5 Flash for JSON structure speed
  
  const prompt = `
    Create a detailed song concept for a ${genre} track.
    Mood: ${mood}
    Topic: ${topic}
    
    Return a structured JSON object containing the song title, estimated BPM, musical key, 
    a verse and chorus of lyrics, chord progression, a short description, 
    and a mood analysis (numbers 0-100) for energy, valence, danceability, acousticness, and instrumentalness.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          style: { type: Type.STRING },
          bpm: { type: Type.INTEGER },
          key: { type: Type.STRING },
          lyrics: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          chords: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: { type: Type.STRING },
          moodAnalysis: {
            type: Type.OBJECT,
            properties: {
              energy: { type: Type.NUMBER },
              valence: { type: Type.NUMBER },
              danceability: { type: Type.NUMBER },
              acousticness: { type: Type.NUMBER },
              instrumentalness: { type: Type.NUMBER }
            },
            required: ["energy", "valence", "danceability", "acousticness", "instrumentalness"]
          }
        },
        required: ["title", "style", "bpm", "key", "lyrics", "chords", "description", "moodAnalysis"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as SongConcept;
};

export const generateFullLyrics = async (concept: SongConcept): Promise<string[]> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";

  const prompt = `
    Write full, complete lyrics (Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro) 
    for a song with the following details:
    Title: "${concept.title}"
    Style: "${concept.style}"
    Topic/Description: "${concept.description}"
    Key: "${concept.key}"
    BPM: ${concept.bpm}
    
    The lyrics should be creative, rhyming, and fit the style.
    
    Return a JSON object with a property 'lyrics' which is an array of strings, where each string is a line of the lyrics or a section header (e.g. [Chorus]).
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lyrics: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });
  
  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  const json = JSON.parse(text);
  return json.lyrics;
};

export const generateCoverArt = async (
  title: string,
  style: string,
  description: string
): Promise<string> => {
  // Initialize client at call time
  const ai = getAiClient();
  // Using gemini-3-pro-image-preview for high quality cover art
  const model = "gemini-3-pro-image-preview";
  
  const prompt = `
    Create a high-quality, artistic album cover for a song titled "${title}".
    Genre/Style: ${style}.
    Vibe: ${description}.
    The image should be abstract, visually striking, and suitable for a music streaming platform.
    Do not include text on the image.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  // Extract base64 image from response
  let imageUrl = "";
  
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageUrl) {
    throw new Error("Failed to generate image");
  }

  return imageUrl;
};