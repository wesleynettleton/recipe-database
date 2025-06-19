import fs from 'fs';
import path from 'path';

const fontDir = path.join(process.cwd(), 'app', 'components', 'pdf', 'fonts');

const oswaldRegular = fs.readFileSync(path.join(fontDir, 'Oswald-Regular.ttf'));
const latoRegular = fs.readFileSync(path.join(fontDir, 'Lato-Regular.ttf'));
const latoItalic = fs.readFileSync(path.join(fontDir, 'Lato-Italic.ttf'));
const latoBold = fs.readFileSync(path.join(fontDir, 'Lato-Bold.ttf'));

export const fonts = {
    oswald: {
        regular: oswaldRegular,
    },
    lato: {
        regular: latoRegular,
        italic: latoItalic,
        bold: latoBold,
    }
}; 