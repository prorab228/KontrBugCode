// suggestionProviders.js - только базовые классы
class SuggestionProvider {
    constructor() {
        this.suggestions = [];
    }

    getSuggestions(currentWord) {
        return this.suggestions.filter(suggestion =>
            suggestion.matchText.toLowerCase().startsWith(currentWord.toLowerCase())
        ).slice(0, 10);
    }

    addSuggestion(matchText, displayText, insertText, type, typeLabel, cursorOffset = 0) {
        this.suggestions.push({
            matchText,
            displayText,
            insertText,
            type,
            typeLabel,
            cursorOffset
        });
    }
}

// Базовый класс для статических библиотечных провайдеров (оставим для расширения)
class StaticLibraryProvider extends SuggestionProvider {
    constructor(objectType) {
        super();
        this.objectType = objectType;
    }
}