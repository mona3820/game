import { GoogleGenAI, Type } from "@google/genai";
import { StoryScene } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const storySceneSchema = {
  type: Type.OBJECT,
  properties: {
    scene: {
      type: Type.STRING,
      description: "الجزء التالي من القصة البوليسية التفاعلية باللغة العربية. يجب أن يصف الموقف الحالي.",
    },
    choices: {
      type: Type.ARRAY,
      description: "مصفوفة من 2 إلى 4 خيارات نصية للاعب. كل خيار يجب أن يؤدي إلى مسار مختلف في القصة.",
      items: { type: Type.STRING },
    },
    isEnding: {
        type: Type.BOOLEAN,
        description: "يكون 'true' إذا كان هذا المشهد هو نهاية القصة، وإلا 'false'.",
    },
    sceneType: {
      type: Type.STRING,
      description: "تصنيف نغمة المشهد الحالي. يمكن أن يكون 'neutral' (محايد)، 'positive' (إيجابي، عند تحقيق تقدم)، 'negative' (سلبي، عند الوقوع في فخ)، أو 'suspense' (غامض/متوتر). هذا يساعد في اختيار المؤثر الصوتي المناسب.",
      enum: ['neutral', 'positive', 'negative', 'suspense'],
    },
  },
  required: ["scene", "choices", "isEnding"],
};

const formatStoryHistory = (history: { scene: string, choice: string }[]): string => {
    if (history.length === 0) return "لا يوجد تاريخ حتى الآن.";
    return history.map((turn, index) => 
        `المشهد ${index + 1}: ${turn.scene}\nالقرار المتخذ: ${turn.choice}`
    ).join('\n\n');
};


export const generateStoryScene = async (history: { scene: string, choice: string }[]): Promise<StoryScene> => {
  try {
    const isFirstScene = history.length === 0;

    const prompt = isFirstScene
      ? "أنت كاتب قصص بوليسية تفاعلية. ابدأ قصة قصيرة وغامضة باللغة العربية على طراز المحقق كونان. يجب أن تضع اللاعب في موقف يتطلب منه اتخاذ قرار. قدم وصفاً للمشهد، ثم قدم 3 خيارات مختلفة يمكن للاعب اتخاذها. يجب أن تكون القصة مشوقة. لا تنهِ القصة في هذه المرحلة."
      : `أنت كاتب قصص بوليسية تفاعلية. هذه هي أحداث القصة حتى الآن:
        ${formatStoryHistory(history)}
        
        بناءً على القرار الأخير، أكمل القصة بجزء جديد ومثير باللغة العربية. صف ما يحدث بعد ذلك، ثم قدم 2-4 خيارات جديدة للاعب. قد يؤدي أحد الخيارات إلى نهاية القصة. إذا كان هذا هو المشهد الأخير، فضع علامة 'isEnding' على 'true'. قم بتصنيف المشهد الجديد كـ 'neutral', 'positive', 'negative', أو 'suspense'.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: storySceneSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    
    if (parsedJson.scene && parsedJson.choices && typeof parsedJson.isEnding !== 'undefined') {
        return parsedJson as StoryScene;
    } else {
        throw new Error("Invalid JSON structure received from API");
    }

  } catch (error) {
    console.error("Error generating story scene:", error);
    // Fallback story scene in case of API error
    return {
      scene: "حدث خطأ غير متوقع في سير الأحداث. يبدو أن هناك قوة خارجية تتلاعب بملف القضية. هل تريد بدء تحقيق جديد؟",
      choices: ["ابدأ من جديد"],
      isEnding: true,
      sceneType: 'negative',
    };
  }
};


export const generateHint = async (history: { scene: string, choice: string }[], currentScene: StoryScene): Promise<string> => {
    try {
        const prompt = `أنت مرشد حكيم وغامض في لعبة تحقيق تفاعلية. اللاعب يواجه الآن خيارًا صعبًا.
        
        ملخص القصة حتى الآن:
        ${formatStoryHistory(history)}

        المشهد الحالي الذي يراه اللاعب:
        "${currentScene.scene}"

        الخيارات المتاحة للاعب:
        - ${currentScene.choices.join('\n- ')}

        مهمتك هي تقديم تلميح واحد قصير وغامض باللغة العربية لمساعدة اللاعب. **لا تكشف عن الإجابة الصحيحة أو النتيجة المباشرة لأي خيار.** يجب أن يكون التلميح دقيقًا ومثيرًا للتفكير.
        أمثلة على التلميحات الجيدة: "أحيانًا، الغرف الهادئة تحمل الأسرار الأعلى صوتًا." أو "النهج المباشر ليس دائمًا أسرع طريق للحقيقة."`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating hint:", error);
        return "لا يمكن استخلاص أي تلميحات في هذا الوقت. اعتمد على حدسك.";
    }
};
