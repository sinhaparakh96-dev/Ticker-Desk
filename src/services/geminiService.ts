import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export interface CalculationData {
  revenue?: string;
  expenses?: string;
  financeCost?: string;
  depreciation?: string;
  ebitda?: string;
  margin?: string;
  nii?: string;
  gnpa?: string;
  nnpa?: string;
  provisions?: string;
  isBanking?: boolean;
}

export interface NewsflashResponse {
  newsflashes: string;
  calculations: CalculationData;
}

const SYSTEM_PROMPT = `
You are an equity research assistant helping create TV-style business newsflashes for an equity researcher in India. 
You write multiple newsflashes from each notification, as long as they are material. 

MATERIALITY RULES:
- Prioritize quarterly numbers over annual numbers.
- Quarterly/annual financial results
- Mergers, acquisitions, demergers, amalgamations
- Board changes (CEO, MD, CFO appointments or resignations)
- Fundraising (QIP, rights issue, preferential allotment, FPO)
- Stake sales or block deals >5% shareholding
- Regulatory actions (SEBI orders, RBI directions, court orders)
- Dividend declarations or buyback announcements
- Major contracts or order wins (>5% of annual revenue)
- Credit rating changes
- Insolvency or default notices
- Tax demands or notices
- Raids at premises
- Accidents at factories/offices/assets
- New launches that are material
- Appellate tribunal actions

IGNORE: Routine intimations, venue changes, duplicates, ISIN/XBRL confirmations, trading window notices.

FORMAT RULES:
- Max 80 characters per newsflash (including spaces).
- Format: [TICKER]: [Event] — [Key figure or detail]
- Use Indian number format: Cr, Lakh (not millions/billions).
- Add "CONTEXT:" at the end of all flashes if it adds value.
- Tone: neutral, factual, broadcast-ready.
- NO editorializing ("surges", "crashes", "soars").
- Symbols:
  * (GU) for green arrow up
  * (RD) for red arrow down
  * (GD) for Green arrow down (losses/inflation coming down)
  * (GU) for Red arrow up (losses widening, costs going up)
- Replace ₹ with \`.

CALCULATIONS:
- EBITDA = {(Revenue From Ops - Total Expenses) + Finance Cost + Depreciation/Amortization}
- EBITDA Margin = EBITDA / Revenue
- Profit = Profit Attributable To Owners (if unavailable, use Net Profit)
- NII = Interest Income - Interest Expended
- For Excise Duty: 
  * Net Revenue = Revenue - Excise Duty
  * Net Total Expense = Total Expense - Excise Duty
  * EBITDA = {(Net Revenue - Net Total Expense) + Finance Cost + Depreciation}

OUTPUT TEMPLATES:
1. General: 
   Profit (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   Revenue (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   EBITDA (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   Margins At X% Vs Y% (YoY)

2. Banking:
   Net Profit (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   NII (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   GNPA At X% Vs Y% (QoQ)
   NNPA At X% Vs Y% (QoQ)
   Provisions Stand At \`X Cr Vs \`Y Cr (YoY)

3. Pharma/Manufacturing:
   Profit (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   Revenue (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   EBITDA (GU)/(RD) X% At \`X Cr Vs \`Y Cr (YoY)
   Margins At X% Vs Y% (YoY)
   Guidance: [Management Quote]

RESPONSE FORMAT:
You must strictly return valid JSON data conforming to the schema. 
CRITICAL: Determine accurately if the company belongs to the Banking/Financial sector. If it is an IT, Pharma, Auto, FMCG, Manufacturing, or other standard corporate firm, "isBanking" MUST be strictly boolean false. If it is a Bank, NBFC, or Financial Institution, set "isBanking" to true.

Current Notification Text:
`;

export async function generateNewsflashes(text: string, fileData?: { data: string, mimeType: string }): Promise<NewsflashResponse> {
  const parts: any[] = [{ text: SYSTEM_PROMPT + text }];
  
  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType
      }
    });
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: parts,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          newsflashes: { 
            type: Type.STRING, 
            description: "The formatted flashes string separated by newlines" 
          },
          calculations: {
            type: Type.OBJECT,
            properties: {
              revenue: { type: Type.STRING, nullable: true },
              expenses: { type: Type.STRING, nullable: true },
              financeCost: { type: Type.STRING, nullable: true },
              depreciation: { type: Type.STRING, nullable: true },
              ebitda: { type: Type.STRING, nullable: true },
              margin: { type: Type.STRING, nullable: true },
              nii: { type: Type.STRING, nullable: true },
              gnpa: { type: Type.STRING, nullable: true },
              nnpa: { type: Type.STRING, nullable: true },
              provisions: { type: Type.STRING, nullable: true },
              isBanking: { 
                type: Type.BOOLEAN,
                description: "true ONLY if this is a banking/financial company, false for all others (IT, Pharma, General)." 
              }
            },
            required: ["isBanking"]
          }
        },
        required: ["newsflashes", "calculations"]
      }
    }
  });
  
  try {
    const responseText = result.text || "{}";
    // Clean potential markdown code blocks
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  } catch (err) {
    console.error("Failed to parse Gemini response:", err);
    return {
      newsflashes: result.text || "Error processing",
      calculations: {}
    };
  }
}
