import { nanoid } from 'nanoid';
import { newBlock, type Block, type BlockType, type NoteCover, type NoteProperties } from '../store/notebookStore';

/* ────────────────────────────────────────────────────────────────────────
 * Note templates (notebook upgrade, Phase 3).
 * Blocks are stored as lightweight specs and instantiated (fresh ids) when a
 * note is created from the template.
 * ──────────────────────────────────────────────────────────────────────── */

export type TemplateCategory = 'personal' | 'productividad' | 'trading' | 'estilo_de_vida' | 'organizacion' | 'creatividad';

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  personal: 'Personal', productividad: 'Productividad', trading: 'Trading',
  estilo_de_vida: 'Estilo de vida', organizacion: 'Organización', creatividad: 'Creatividad',
};
export const CATEGORY_ORDER: TemplateCategory[] = ['personal', 'productividad', 'trading', 'estilo_de_vida', 'organizacion', 'creatividad'];

const CATEGORY_GRADIENT: Record<TemplateCategory, string> = {
  trading: 'linear-gradient(135deg,#1e3a8a,#4f8fff)',
  personal: 'linear-gradient(135deg,#312e81,#8b5cf6)',
  productividad: 'linear-gradient(135deg,#0f172a,#334155)',
  estilo_de_vida: 'linear-gradient(135deg,#064e3b,#22c55e)',
  organizacion: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
  creatividad: 'linear-gradient(135deg,#7c2d12,#f59e0b)',
};

export interface TemplateBlockSpec { type: BlockType; content?: Block['content'] }
export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  tags?: string[];
  properties?: NoteProperties;
  cover?: NoteCover;
  blocks: TemplateBlockSpec[];
  custom?: boolean;
}

/* ── spec helpers ─────────────────────────────────────────────────────── */
const h = (text: string, level: 1 | 2 | 3 = 2): TemplateBlockSpec => ({ type: 'heading', content: { level, text } });
const p = (text = ''): TemplateBlockSpec => ({ type: 'paragraph', content: { text } });
const quote = (text: string): TemplateBlockSpec => ({ type: 'quote', content: { text } });
const callout = (heading: string, text = ''): TemplateBlockSpec => ({ type: 'callout', content: { heading, text } });
const check = (...labels: string[]): TemplateBlockSpec => ({ type: 'checklist', content: { items: labels.map(l => ({ id: nanoid(), text: l, checked: false })) } });
const bullets = (...labels: string[]): TemplateBlockSpec => ({ type: 'bulleted_list', content: { listItems: labels.map(l => ({ id: nanoid(), text: l })) } });
type ChartKind = NonNullable<Block['content']['config']>['chart']['type'] | 'none';
const tradesTable = (title: string, template: NonNullable<Block['content']['config']>['template'], range: NonNullable<Block['content']['config']>['dateRange']['type'], chart: ChartKind): TemplateBlockSpec => ({
  type: 'trades_table',
  content: { config: { template, title, dateRange: { type: range }, filters: {}, columns: ['date', 'asset', 'direction', 'pnl', 'rr', 'setup'], groupBy: 'none', chart: { enabled: chart !== 'none', type: chart === 'none' ? 'equity' : chart, position: 'top' } } },
});

function tpl(id: string, title: string, description: string, category: TemplateCategory, blocks: TemplateBlockSpec[], extra: Partial<NoteTemplate> = {}): NoteTemplate {
  return { id, title, description, category, cover: { type: 'gradient', color: CATEGORY_GRADIENT[category] }, blocks, ...extra };
}

/* ── Default templates ────────────────────────────────────────────────── */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  // TRADING
  tpl('t_session', 'Análisis de sesión', 'Registra y analiza tus sesiones de trading.', 'trading', [
    h('Resumen de la sesión'), p('¿Cómo fue el día en una frase?'),
    h('Lo que salió bien', 3), bullets('', ''),
    h('Lo que puedo mejorar', 3), bullets('', ''),
    h('Operaciones'), tradesTable('Operaciones de hoy', 'custom', 'this_week', 'equity'),
  ], { tags: ['sesión', 'trading'] }),
  tpl('t_psych', 'Psicología de trading', 'Trabaja en tu mentalidad y disciplina.', 'trading', [
    callout('Estado mental de hoy', '¿Cómo llegas a los mercados?'),
    h('¿Seguí mi plan?', 3), p(''),
    h('Emociones dominantes', 3), bullets('', ''),
    h('Una cosa que haré mejor mañana', 3), p(''),
  ], { tags: ['psicología'] }),
  tpl('t_plan', 'Plan de trading', 'Define tu estrategia y reglas.', 'trading', [
    h('Mercados y horarios'), p(''),
    h('Setups que opero'), bullets('', ''),
    h('Gestión de riesgo'), check('Riesgo por operación definido', 'Pérdida máxima diaria', 'Nº máximo de operaciones'),
    h('Reglas de oro'), bullets('', '', ''),
  ], { tags: ['plan'] }),
  tpl('t_weekly', 'Revisión semanal', 'Analiza tu progreso y establece próximas metas.', 'trading', [
    h('Resumen de la semana'), p(''),
    h('Métricas'), tradesTable('Operaciones de la semana', 'weekly_review', 'this_week', 'equity'),
    h('Lecciones'), bullets('', ''),
    h('Metas para la próxima semana'), check('', ''),
  ], { tags: ['revisión', 'semanal'] }),
  tpl('t_monthly', 'Revisión mensual', 'Visión general del mes y objetivos.', 'trading', [
    h('Resumen del mes'), p(''),
    h('Operaciones'), tradesTable('Operaciones del mes', 'monthly_review', 'this_month', 'bars'),
    h('Qué funcionó / qué no'), bullets('', ''),
  ], { tags: ['revisión', 'mensual'] }),
  tpl('t_playbook', 'Setup playbook', 'Documenta un setup con ejemplos.', 'trading', [
    h('Nombre del setup'), p(''),
    h('Condiciones de entrada'), check('', ''),
    h('Gestión y salida'), p(''),
    h('Ejemplos'), tradesTable('Ejemplos del setup', 'by_setup', 'all', 'none'),
  ], { tags: ['playbook'] }),
  tpl('t_premarket', 'Rutina de mañana', 'Checklist pre-market antes de operar.', 'trading', [
    callout('Pre-market', 'Prepárate antes de la apertura.'),
    check('Revisar noticias y calendario económico', 'Marcar niveles clave', 'Definir sesgo del día', 'Revisar mi plan de riesgo', 'Estado mental OK'),
  ], { tags: ['rutina'] }),
  // PERSONAL
  tpl('p_diary', 'Diario personal', 'Reflexiona sobre tu día, pensamientos y emociones.', 'personal', [
    quote('A better version of myself, every day.'),
    h('Resumen del día'), p(''),
    h('Lo que salió bien', 3), bullets('', ''),
    h('Lo que puedo mejorar', 3), check(''),
  ], { tags: ['diario', 'personal'] }),
  tpl('p_reflection', 'Reflexión diaria', 'Pensamientos cortos del día.', 'personal', [
    h('¿Por qué estoy agradecido?', 3), bullets('', '', ''),
    h('¿Qué aprendí hoy?', 3), p(''),
  ], { tags: ['reflexión'] }),
  tpl('p_letter', 'Carta a mi yo futuro', 'Escríbete a ti mismo dentro de un año.', 'personal', [
    p('Querido yo del futuro,'), p(''), p('Con cariño, tu yo de hoy.'),
  ], { tags: ['personal'] }),
  // PRODUCTIVIDAD
  tpl('pr_okr', 'Objetivos del trimestre', 'Define tus objetivos trimestrales.', 'productividad', [
    h('Objetivos principales'), check('', '', ''),
    h('Resultados clave'), bullets('', '', ''),
    h('Acciones'), check('', ''),
  ], { tags: ['objetivos'] }),
  tpl('pr_month', 'Objetivos del mes', 'Metas y foco del mes.', 'productividad', [
    h('Foco del mes'), p(''),
    h('Metas'), check('', '', ''),
  ], { tags: ['objetivos'] }),
  tpl('pr_day', 'Plan diario', 'Organiza tu día y aumenta tu productividad.', 'productividad', [
    h('3 prioridades de hoy'), check('', '', ''),
    h('Agenda'), bullets('', ''),
    h('Notas'), p(''),
  ], { tags: ['productividad'] }),
  tpl('pr_1on1', 'Reunión 1:1', 'Prepara y registra una reunión 1:1.', 'productividad', [
    h('Temas a tratar'), bullets('', ''),
    h('Acuerdos'), check('', ''),
    h('Seguimiento'), p(''),
  ], { tags: ['reunión'] }),
  // ESTILO DE VIDA
  tpl('l_habits', 'Hábitos', 'Seguimiento de hábitos diarios.', 'estilo_de_vida', [
    h('Hábitos de hoy'), check('Dormir 8h', 'Entrenar', 'Leer', 'Meditar', 'Sin redes antes de las 10'),
  ], { tags: ['hábitos'] }),
  tpl('l_workout', 'Plan de entrenamiento', 'Registra tus entrenamientos y progreso.', 'estilo_de_vida', [
    h('Entrenamiento de hoy'), p(''),
    h('Ejercicios'), bullets('', '', ''),
    h('Sensaciones'), p(''),
  ], { tags: ['entrenamiento'] }),
  tpl('l_nutrition', 'Plan de alimentación', 'Organiza tu nutrición y comidas.', 'estilo_de_vida', [
    h('Comidas de hoy'), bullets('Desayuno —', 'Comida —', 'Cena —'),
    h('Objetivos'), check('Proteína', 'Agua', 'Verduras'),
  ], { tags: ['alimentación'] }),
  tpl('l_trip', 'Plan de viaje', 'Planifica tus viajes y experiencias.', 'estilo_de_vida', [
    h('Destino y fechas'), p(''),
    h('Itinerario'), bullets('', ''),
    h('Presupuesto'), check('Vuelos', 'Alojamiento', 'Actividades'),
  ], { tags: ['viajes'] }),
  // ORGANIZACIÓN
  tpl('o_tasks', 'Lista de tareas', 'Mantén el control de tus tareas.', 'organizacion', [
    h('Por hacer'), check('', '', ''),
    h('En progreso'), check(''),
    h('Hecho'), check(''),
  ], { tags: ['tareas'] }),
  tpl('o_ideas_db', 'Base de datos de ideas', 'Organiza y desarrolla tus ideas.', 'organizacion', [
    h('Ideas'), bullets('', '', ''),
    h('Siguientes pasos'), check('', ''),
  ], { tags: ['ideas'] }),
  // CREATIVIDAD
  tpl('c_ideas', 'Ideas', 'Captura y desarrolla tus ideas.', 'creatividad', [
    callout('💡 Idea', ''),
    h('Desarrollo'), p(''),
    h('Próximos pasos'), check('', ''),
  ], { tags: ['ideas'] }),
  tpl('c_brainstorm', 'Brainstorm', 'Lluvia de ideas libre.', 'creatividad', [
    h('Tema'), p(''),
    h('Ideas (sin filtro)'), bullets('', '', '', ''),
    h('Las mejores'), check('', ''),
  ], { tags: ['brainstorm'] }),
];

export function templateThumbBackground(t: NoteTemplate): string {
  return t.cover?.color ?? CATEGORY_GRADIENT[t.category];
}

/** Instantiate a template into concrete note fields (fresh block ids). */
export function instantiateTemplate(t: NoteTemplate): { title: string; blocks: Block[]; cover?: NoteCover; properties?: NoteProperties; tags: string[] } {
  return {
    title: t.title,
    blocks: t.blocks.map(b => newBlock(b.type, b.content ?? {})),
    cover: t.cover,
    properties: t.properties,
    tags: t.tags ?? [],
  };
}
