import fs from 'fs';
import path from 'path';

const fontDir = path.resolve(process.cwd());

const oswaldRegular = fs.readFileSync(path.join(fontDir, 'Oswald-Regular.ttf')).toString('base64');
const latoRegular = fs.readFileSync(path.join(fontDir, 'Lato-Regular.ttf')).toString('base64');
const latoItalic = fs.readFileSync(path.join(fontDir, 'Lato-Italic.ttf')).toString('base64');
const latoBold = fs.readFileSync(path.join(fontDir, 'Lato-Bold.ttf')).toString('base64');

export const fonts = {
    oswald: {
        regular: `data:font/truetype;charset=utf-8;base64,${oswaldRegular}`
    },
    lato: {
        regular: `data:font/truetype;charset=utf-8;base64,${latoRegular}`,
        italic: `data:font/truetype;charset=utf-8;base64,${latoItalic}`,
        bold: `data:font/truetype;charset=wtff-8;base64,${latoBold}`
    }
} 