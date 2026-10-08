import type { Difficulty, QuestionType } from "@dibora/types";

export type Subject = { id: string; name: string; color: string };
export type Topic = { id: string; subjectId: string; name: string };
export type Note = { id: string; topicId: string; title: string; summary: string; sections: { heading: string; body: string }[]; formulas: string[]; keyPoints: string[]; mistakes: string[]; tips: string[] };
export type Question = { id: string; subjectId: string; topicId: string; difficulty: Difficulty; type: QuestionType; text: string; options: { id: string; text: string }[]; correctOptionId?: string; numericAnswer?: number; tolerance?: number; explanation: string };
export type ExamDef = { id: string; type: "DIAGNOSTIC" | "TOPIC" | "SUBJECT" | "MOCK"; title: string; description: string; minutes: number; passing: number; premium: boolean; questionIds: string[]; subjectId?: string };
export type Plan = { id: string; name: string; interval: string; priceMinor: number; features: string[] };

export const SUBJECTS: Subject[] = [
  { id: "math", name: "Mathematics", color: "#0b5d3b" }, { id: "phy", name: "Physics", color: "#17324d" },
  { id: "chem", name: "Chemistry", color: "#b7791f" }, { id: "bio", name: "Biology", color: "#1f8a5b" }, { id: "eng", name: "English", color: "#8a3b6e" },
];
export const TOPICS: Topic[] = [
  { id: "alg", subjectId: "math", name: "Algebra" }, { id: "calc", subjectId: "math", name: "Calculus" },
  { id: "mech", subjectId: "phy", name: "Mechanics" }, { id: "elec", subjectId: "phy", name: "Electricity" },
  { id: "org", subjectId: "chem", name: "Organic Chemistry" }, { id: "stoi", subjectId: "chem", name: "Stoichiometry" },
  { id: "gen", subjectId: "bio", name: "Genetics" }, { id: "cell", subjectId: "bio", name: "Cell Biology" },
  { id: "gram", subjectId: "eng", name: "Grammar" },
];

const mc = (id: string, topicId: string, difficulty: Difficulty, text: string, opts: string[], correct: number, explanation: string): Question => {
  const t = TOPICS.find((x) => x.id === topicId)!;
  const options = opts.map((o, i) => ({ id: `${id}-o${i}`, text: o }));
  return { id, subjectId: t.subjectId, topicId, difficulty, type: opts.length === 2 ? "TRUE_FALSE" : "MULTIPLE_CHOICE", text, options, correctOptionId: options[correct]!.id, explanation };
};
const num = (id: string, topicId: string, difficulty: Difficulty, text: string, answer: number, tolerance: number, explanation: string): Question => ({
  id, subjectId: TOPICS.find((x) => x.id === topicId)!.subjectId, topicId, difficulty, type: "NUMERICAL", text, options: [], numericAnswer: answer, tolerance, explanation });

export const QUESTIONS: Question[] = [
  mc("q1", "alg", "EASY", "Solve for x: 2x + 6 = 14", ["x = 3", "x = 4", "x = 5", "x = 10"], 1, "Subtract 6 from both sides to get 2x = 8, so x = 4."),
  mc("q2", "alg", "MEDIUM", "What are the roots of x² − 5x + 6 = 0?", ["1 and 6", "2 and 3", "−2 and −3", "−1 and 6"], 1, "Factor as (x − 2)(x − 3) = 0, so x = 2 or x = 3."),
  mc("q3", "alg", "HARD", "If log₂(x) + log₂(x − 2) = 3, what is x?", ["2", "3", "4", "6"], 2, "log₂(x(x−2)) = 3 so x² − 2x = 8, giving x = 4 (x = −2 is rejected)."),
  mc("q4", "alg", "EASY", "The expression (a + b)² equals a² + b².", ["True", "False"], 1, "(a + b)² = a² + 2ab + b². The middle term 2ab is missing."),
  mc("q5", "calc", "EASY", "What is the derivative of x³?", ["x²", "3x²", "3x", "x⁴/4"], 1, "Power rule: d/dx xⁿ = n·xⁿ⁻¹, so 3x²."),
  mc("q6", "calc", "MEDIUM", "∫ 2x dx =", ["x² + C", "2x² + C", "x + C", "2 + C"], 0, "Integrate term by term: 2·x²/2 = x², plus the constant C."),
  num("q7", "calc", "MEDIUM", "Find the slope of y = x² at x = 3.", 6, 0, "dy/dx = 2x, and at x = 3 this equals 6."),
  mc("q8", "calc", "HARD", "lim (x→0) sin(x)/x equals:", ["0", "1", "∞", "Does not exist"], 1, "This is a standard limit that equals 1."),
  mc("q9", "mech", "EASY", "Newton's second law states that:", ["F = mv", "F = ma", "F = m/a", "F = a/m"], 1, "Net force equals mass times acceleration."),
  num("q10", "mech", "MEDIUM", "A 2 kg object accelerates at 3 m/s². What net force acts on it (in N)?", 6, 0, "F = ma = 2 × 3 = 6 N."),
  mc("q11", "mech", "MEDIUM", "Which quantity is a vector?", ["Speed", "Mass", "Velocity", "Time"], 2, "Velocity has both magnitude and direction."),
  mc("q12", "mech", "HARD", "A ball is thrown straight up. At its highest point its acceleration is:", ["0", "9.8 m/s² upward", "9.8 m/s² downward", "Equal to its velocity"], 2, "Gravity still acts, so acceleration is 9.8 m/s² downward even though velocity is momentarily zero."),
  mc("q13", "elec", "EASY", "Ohm's law is:", ["V = IR", "V = I/R", "I = VR", "R = VI"], 0, "Voltage equals current times resistance."),
  num("q14", "elec", "MEDIUM", "A 12 V battery drives a current through a 4 Ω resistor. What is the current (A)?", 3, 0, "I = V/R = 12/4 = 3 A."),
  mc("q15", "org", "EASY", "What is the general formula of alkanes?", ["CₙH₂ₙ", "CₙH₂ₙ₊₂", "CₙH₂ₙ₋₂", "CₙHₙ"], 1, "Alkanes are saturated hydrocarbons with formula CₙH₂ₙ₊₂."),
  mc("q16", "org", "MEDIUM", "Which functional group defines an alcohol?", ["–COOH", "–OH", "–CHO", "–NH₂"], 1, "Alcohols contain a hydroxyl (–OH) group."),
  num("q17", "stoi", "MEDIUM", "How many moles are in 36 g of water? (H₂O = 18 g/mol)", 2, 0, "n = mass / molar mass = 36 / 18 = 2 mol."),
  mc("q18", "stoi", "HARD", "In 2H₂ + O₂ → 2H₂O, how many moles of H₂ react with 3 mol O₂?", ["3", "4", "6", "12"], 2, "The ratio H₂:O₂ is 2:1, so 3 mol O₂ needs 6 mol H₂."),
  mc("q19", "gen", "EASY", "Which molecule carries genetic information?", ["ATP", "DNA", "Glucose", "Lipid"], 1, "DNA stores hereditary information."),
  mc("q20", "gen", "MEDIUM", "In a monohybrid cross Aa × Aa, the expected phenotype ratio is:", ["1:1", "3:1", "1:2:1", "9:3:3:1"], 1, "With complete dominance, 3 dominant : 1 recessive."),
  mc("q21", "cell", "EASY", "Which organelle produces most of the cell's ATP?", ["Nucleus", "Ribosome", "Mitochondrion", "Golgi body"], 2, "Mitochondria carry out aerobic respiration."),
  mc("q22", "cell", "MEDIUM", "Plant cells have a cell wall but animal cells do not.", ["True", "False"], 0, "The cell wall (cellulose) is a defining plant-cell feature."),
  mc("q23", "gram", "EASY", "Choose the correct sentence.", ["She don't like tea.", "She doesn't like tea.", "She not like tea.", "She doesn't likes tea."], 1, "With third-person singular, use 'doesn't' plus the base verb."),
  mc("q24", "gram", "MEDIUM", "'If I ___ more time, I would study again.' Choose the best word.", ["have", "had", "will have", "having"], 1, "Second conditional uses past simple in the if-clause."),
];

export const NOTES: Note[] = [
  { id: "n-alg", topicId: "alg", title: "Quadratic equations", summary: "How to solve ax² + bx + c = 0 by factoring and the quadratic formula.",
    sections: [{ heading: "Main idea", body: "A quadratic equation has degree 2 and up to two real roots. Try factoring first; if that fails, use the quadratic formula." }, { heading: "Worked example", body: "x² − 5x + 6 = 0 factors into (x − 2)(x − 3) = 0, so x = 2 or x = 3." }],
    formulas: ["x = (−b ± √(b² − 4ac)) / 2a", "Discriminant D = b² − 4ac"], keyPoints: ["D > 0: two real roots", "D = 0: one repeated root", "D < 0: no real roots"], mistakes: ["Forgetting the ± sign", "Dropping a negative sign when substituting b"], tips: ["Check roots by substituting back into the equation."] },
  { id: "n-calc", topicId: "calc", title: "Derivatives: the power rule", summary: "Differentiate polynomial terms quickly.", sections: [{ heading: "Main idea", body: "The derivative measures the rate of change. For xⁿ the derivative is n·xⁿ⁻¹." }],
    formulas: ["d/dx (xⁿ) = n·xⁿ⁻¹", "d/dx (c) = 0"], keyPoints: ["Differentiate term by term", "Constants vanish"], mistakes: ["Forgetting to reduce the power by 1"], tips: ["Write the power in front before simplifying."] },
  { id: "n-mech", topicId: "mech", title: "Newton's laws of motion", summary: "Force, mass and acceleration.", sections: [{ heading: "Second law", body: "The net force on an object equals its mass times its acceleration. Direction of acceleration matches the net force." }],
    formulas: ["F = ma", "W = mg"], keyPoints: ["Force is a vector", "Net force, not any single force, determines acceleration"], mistakes: ["Using speed instead of acceleration", "Ignoring friction"], tips: ["Draw a free-body diagram before calculating."] },
  { id: "n-elec", topicId: "elec", title: "Ohm's law", summary: "Relating voltage, current and resistance.", sections: [{ heading: "Main idea", body: "For many conductors, current is proportional to voltage at constant temperature." }], formulas: ["V = IR", "P = VI"], keyPoints: ["Series resistors add", "Parallel resistors share voltage"], mistakes: ["Mixing up V and I"], tips: ["Use the V-I-R triangle to rearrange."] },
  { id: "n-org", topicId: "org", title: "Alkanes and functional groups", summary: "Naming and recognising basic organic compounds.", sections: [{ heading: "Alkanes", body: "Alkanes are saturated hydrocarbons with single bonds only." }], formulas: ["CₙH₂ₙ₊₂"], keyPoints: ["–OH alcohol", "–COOH carboxylic acid"], mistakes: ["Confusing alkane and alkene formulas"], tips: ["Count carbons first, then name the group."] },
  { id: "n-stoi", topicId: "stoi", title: "The mole concept", summary: "Convert between mass, moles and particles.", sections: [{ heading: "Main idea", body: "One mole contains 6.022 × 10²³ particles. Moles link mass and chemical equations." }], formulas: ["n = m / M"], keyPoints: ["Balance the equation first"], mistakes: ["Using unbalanced ratios"], tips: ["Write the mole ratio from the balanced equation."] },
  { id: "n-gen", topicId: "gen", title: "Mendelian inheritance", summary: "Dominant and recessive alleles.", sections: [{ heading: "Monohybrid cross", body: "Crossing two heterozygotes (Aa × Aa) gives genotypes 1 AA : 2 Aa : 1 aa and a 3:1 phenotype ratio." }], formulas: [], keyPoints: ["Alleles segregate during gamete formation"], mistakes: ["Mixing genotype and phenotype ratios"], tips: ["Use a Punnett square."] },
];

export const EXAMS: ExamDef[] = [
  { id: "diag", type: "DIAGNOSTIC", title: "Diagnostic Assessment", description: "Find your starting level across your subjects.", minutes: 20, passing: 50, premium: false, questionIds: ["q1", "q5", "q9", "q13", "q15", "q17", "q19", "q21", "q2", "q10", "q16", "q23"] },
  { id: "t-alg", type: "TOPIC", title: "Algebra Topic Quiz", description: "Quick check on algebra.", minutes: 10, passing: 50, premium: false, questionIds: ["q1", "q2", "q3", "q4"], subjectId: "math" },
  { id: "t-mech", type: "TOPIC", title: "Mechanics Topic Quiz", description: "Forces and motion.", minutes: 10, passing: 50, premium: false, questionIds: ["q9", "q10", "q11", "q12"], subjectId: "phy" },
  { id: "s-math", type: "SUBJECT", title: "Mathematics Subject Test", description: "Algebra and calculus together.", minutes: 20, passing: 50, premium: true, questionIds: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"], subjectId: "math" },
  { id: "mock1", type: "MOCK", title: "Full Mock Examination 1", description: "Realistic timed mock across all subjects.", minutes: 45, passing: 50, premium: true, questionIds: Array.from({ length: 24 }, (_, i) => `q${i + 1}`) },
];

export const DEFAULT_PLANS: Plan[] = [
  { id: "free", name: "Free", interval: "FREE", priceMinor: 0, features: ["Student profile", "Selected short notes", "20 practice questions a day", "Topic quizzes", "Basic progress", "5 AI messages a day"] },
  { id: "monthly", name: "Premium · Monthly", interval: "MONTHLY", priceMinor: 15000, features: ["Full question bank", "Full mock exams", "Advanced analytics", "Personalized recommendations", "Advanced AI Study Assistant", "Detailed reports"] },
  { id: "quarterly", name: "Premium · Quarterly", interval: "QUARTERLY", priceMinor: 39000, features: ["Everything in Monthly", "Best for one term"] },
  { id: "annual", name: "Premium · Annual", interval: "ANNUAL", priceMinor: 120000, features: ["Everything in Monthly", "Best value for exam year"] },
];
export const LEADERBOARD = [{ name: "Selam T.", points: 2840 }, { name: "Dawit M.", points: 2615 }, { name: "Hana B.", points: 2430 }, { name: "Yonas K.", points: 2210 }, { name: "Meron A.", points: 2005 }];
export const ACHIEVEMENTS = [
  { code: "FIRST_EXAM", name: "First Exam", desc: "Complete any exam" }, { code: "Q100", name: "First 100 Questions", desc: "Answer 100 questions" },
  { code: "Q500", name: "500 Questions", desc: "Answer 500 questions" }, { code: "S7", name: "7-Day Streak", desc: "Study 7 days in a row" },
  { code: "S30", name: "30-Day Streak", desc: "Study 30 days in a row" }, { code: "E90", name: "90% Exam Score", desc: "Score 90% or more" },
  { code: "MOCK", name: "First Mock Exam", desc: "Complete a mock exam" }, { code: "MASTERY", name: "Topic Mastery", desc: "90% accuracy over 20 questions in a topic" },
];
export const subjectName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id;
export const topicName = (id: string) => TOPICS.find((t) => t.id === id)?.name ?? id;
export const formatBirr = (minor: number) => minor === 0 ? "Free" : `ETB ${(minor / 100).toLocaleString("en-US")}`;
