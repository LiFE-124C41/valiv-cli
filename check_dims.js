import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        const imagePath = path.resolve(__dirname, '362221_s.jpg');
        const image = await Jimp.read(imagePath);
        console.log(`Dimensions: ${image.bitmap.width} x ${image.bitmap.height}`);

        // Calculate options
        const widths = [60, 80, 100, 120, 150];
        console.log('\nOptions (Width x Height in characters):');
        widths.forEach(w => {
            const h = Math.floor(w * (image.bitmap.height / image.bitmap.width) * 0.5);
            console.log(`- Width ${w}: ${w} x ${h}`);
        });
    } catch (error) {
        console.error(error);
    }
}

main();
