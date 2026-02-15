// FqbnUtils.js
class FqbnUtils {
    static parseFqbn(fqbn) {
        if (!fqbn) return null;

        const parts = fqbn.split(':');
        if (parts.length < 3) return null;

        const result = {
            vendor: parts[0],
            architecture: parts[1],
            board: parts[2],
            options: {}
        };

        // Парсим опции
        if (parts.length > 3) {
            const options = parts[3].split(',');
            options.forEach(option => {
                const [key, value] = option.split('=');
                if (key && value) {
                    result.options[key] = value;
                }
            });
        }

        return result;
    }

    static buildFqbn(parsed) {
        if (!parsed) return '';

        let fqbn = `${parsed.vendor}:${parsed.architecture}:${parsed.board}`;

        if (Object.keys(parsed.options).length > 0) {
            const options = Object.entries(parsed.options)
                .map(([key, value]) => `${key}=${value}`)
                .join(',');
            fqbn += `:${options}`;
        }

        return fqbn;
    }

    static mergeOptions(fqbn, options) {
        const parsed = this.parseFqbn(fqbn);
        if (!parsed) return fqbn;

        parsed.options = { ...parsed.options, ...options };
        return this.buildFqbn(parsed);
    }

    static getBoardType(fqbn) {
        if (!fqbn) return 'unknown';

        if (fqbn.includes('esp32') || fqbn.includes('esp8266')) {
            return 'esp';
        } else if (fqbn.includes('avr')) {
            return 'avr';
        } else if (fqbn.includes('sam') || fqbn.includes('samd')) {
            return 'sam';
        } else if (fqbn.includes('stm32')) {
            return 'stm32';
        } else if (fqbn.includes('nrf')) {
            return 'nrf';
        } else if (fqbn.includes('mik32')) {
            return 'mik32';
        }

        return 'other';
    }
}

module.exports = FqbnUtils;