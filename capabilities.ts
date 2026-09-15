export const CREATIVE_CAPABILITIES=[
{id:'image.generate',description:'Generate images through a configured image-model adapter',permission:'externalActions'},
{id:'video.generate',description:'Generate videos through a configured video-model adapter',permission:'externalActions'},
{id:'design.web',description:'Plan and generate responsive HTML/CSS/JS web designs',permission:'files'},
{id:'design.app',description:'Design mobile app screens, flows and implementation specs',permission:'files'},
{id:'office.word',description:'Create DOCX documents via local Office conversion',permission:'files'},
{id:'office.excel',description:'Create XLSX spreadsheets and analysis outputs',permission:'files'},
{id:'office.powerpoint',description:'Create PPTX presentations from slide content',permission:'files'},
{id:'office.pdf',description:'Create PDF reports',permission:'files'},
{id:'graphics.svg',description:'Create editable SVG vector artwork suitable for import into vector design software',permission:'files'},
{id:'data.analyze',description:'Analyze CSV/tabular data with statistics and concise findings',permission:'files'}
] as const;
export type CreativeCapability=typeof CREATIVE_CAPABILITIES[number]['id'];
