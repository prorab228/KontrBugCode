class UIManager {
    static init() {
        this.isCodePanelVisible = false;
        this.isOutputPanelExpanded = false;

        this.initCodeEditor();
        this.initResizeHandles();

        this.currentMode = localStorage.getItem('Mode') || 'BlocksMode';
        if(this.currentMode == 'BlocksMode') this.switchToBlocksMode();
        else this.switchToCodeMode();

        window.addEventListener('resize', () => this.resizeBlockly());
      }

    static initResizeHandles() {
        // Обработчик изменения размеров output panel
        const outputPanel = document.getElementById('outputPanel');
        if (outputPanel) {
            const observer = new ResizeObserver(() => this.resizeBlockly());
            observer.observe(outputPanel);
        }

        // Обработчик изменения размеров code panel
        const codePanel = document.getElementById('codePanel');
        if (codePanel) {
            const observer = new ResizeObserver(() => this.resizeBlockly());
            observer.observe(codePanel);
        }
    }

    static resizeBlockly() {
        if (window.workspace && typeof Blockly.svgResize === 'function') {
            // Небольшая задержка для гарантии применения CSS
            setTimeout(() => {
                try {
                    Blockly.svgResize(window.workspace);
                } catch (error) {
                    console.warn('Blockly resize error:', error);
                }
            }, 50);
        }
    }

    // Panel Management
    static toggleCodePanel(forceShow = null) {
        const codePanel = document.getElementById('codePanel');
        this.isCodePanelVisible = forceShow !== null ? forceShow : !this.isCodePanelVisible;
        codePanel.classList.toggle('visible', this.isCodePanelVisible);
         // Обновляем размеры Blockly
        setTimeout(() => this.resizeBlockly(), 100);
    }

    static toggleOutputPanel(forceShow = null) {
        const outputPanel = document.getElementById('outputPanel');
        this.isOutputPanelExpanded = forceShow !== null ? forceShow : !this.isOutputPanelExpanded;

        if (this.isOutputPanelExpanded) {
            outputPanel.classList.remove('collapsed');
            outputPanel.style.height = '300px';
        } else {
            outputPanel.classList.add('collapsed');
            outputPanel.style.height = '40px';
        }
    }

    // View Modes
    static switchToBlocksMode() {
        document.body.classList.remove('code-mode');
        document.body.classList.add('blocks-mode');
        this.updateModeButtons('blocks');
        this.toggleCodePanel(false);
        localStorage.setItem('Mode', 'BlocksMode');

        // Обновляем размеры Blockly
        setTimeout(() => this.resizeBlockly(), 100);
    }

    static switchToCodeMode() {
        document.body.classList.remove('blocks-mode');
        document.body.classList.add('code-mode');
        this.updateModeButtons('code');
        this.toggleCodePanel(true);
        this.switchTab('editor');
        localStorage.setItem('Mode', 'CodeMode');

        // Обновляем размеры Blockly
        setTimeout(() => this.resizeBlockly(), 100);
    }

    static updateModeButtons(activeMode) {
        const blocksBtn = document.getElementById('blocksModeBtn');
        const codeBtn = document.getElementById('codeModeBtn');

        blocksBtn?.classList.toggle('active', activeMode === 'blocks');
        codeBtn?.classList.toggle('active', activeMode === 'code');
    }

    // Tab Management
    static switchTab(tabName) {
        this.switchTabGroup('.code-panel-tabs', '.code-tab-content', tabName);
        this.handleTabSwitch(tabName);
    }

    static switchOutputTab(tabName) {
       this.switchTabGroup('.output-panel-tabs', '.output-tab-content', tabName);
       this.toggleOutputPanel(true);

        if (tabName === 'serial' && window.SerialManager) {
            window.SerialManager.switchToSerialTab();
        }

        // Обновляем размеры Blockly
        setTimeout(() => this.resizeBlockly(), 100);
    }

    static switchTabGroup(tabSelector, contentSelector, activeTab) {
        const tabs = document.querySelectorAll(`${tabSelector} .code-panel-tab, ${tabSelector} .output-panel-tab`);
        const contents = document.querySelectorAll(contentSelector);

        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        const activeTabElement = document.querySelector(`${tabSelector} [data-tab="${activeTab}"]`);
        const activeContent = document.getElementById(activeTab + 'Tab');

        activeTabElement?.classList.add('active');
        activeContent?.classList.add('active');
    }

    static handleTabSwitch(tabName) {
        if (tabName === 'editor') {
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor?.value) {
                // Optional: handle editor tab activation
            }
        }
    }

    // Code Editor Management
    static initCodeEditor() {
        if (window.CodeEditor) {
            CodeEditor.init();
        }
    }

    static performHighlighting(code) {
        if (!window.hljs) {
            this.fallbackHighlighting(code);
            return;
        }

        try {
            const highlighted = hljs.highlight(code, {
                language: 'arduino',
                ignoreIllegals: true
            }).value;
            this.updateCodePreview(highlighted);
        } catch (error) {
            console.warn('Highlighting error:', error);
            this.fallbackHighlighting(code);
        }
    }

    static fallbackHighlighting(code) {
        const codePreview = document.getElementById('codeEditorPreview');
        if (codePreview) {
            codePreview.textContent = code;
        }
    }

    static updateCodePreview(highlightedCode) {
        const codePreview = document.getElementById('codeEditorPreview');
        if (codePreview) {
            codePreview.innerHTML = highlightedCode;
        }
    }

    // Code Management
    static updateCodeOutput(code) {
        const codeOutput = document.getElementById('codeOutput');
        if (codeOutput) codeOutput.textContent = code;

        if (window.CodeEditor) {
            CodeEditor.setValue(code);
        }

        this.updateCopyButton();

        setTimeout(() => {
            const codeElement = document.getElementById('codeOutput');
            if (codeElement && window.hljs) {
                try {
                    window.hljs.highlightElement(codeElement);
                } catch (error) {
                    console.warn('Output highlighting error:', error);
                }
            }
        }, 100);
    }

    static updateCopyButton() {
        const codeOutput = document.getElementById('codeOutput');
        const copyBtn = document.querySelector('.btn-copy');

        if (copyBtn && codeOutput) {
            const hasCode = codeOutput.textContent &&
                           !codeOutput.textContent.includes('// Сгенерированный код появится здесь...');
            copyBtn.style.display = hasCode ? 'flex' : 'none';
        }
    }

    static clearCodeOutput() {
        this.updateCodeOutput('// Сгенерированный код появится здесь...');
    }

    static getCurrentCode() {
        const editorTab = document.getElementById('editorTab');
        const codeEditor = document.getElementById('codeEditor');

        if (editorTab?.classList.contains('active') && codeEditor) {
            return codeEditor.value;
        } else {
            const codeOutput = document.getElementById('codeOutput');
            return codeOutput ? codeOutput.textContent : '';
        }
    }

    // Editor Actions
    static loadCodeFromEditor() {
        if (!window.CodeEditor || !window.CodeToBlocksConverter || !window.workspace) {
            this.showNotification('Система преобразования не инициализирована', true);
            return;
        }

        const editorCode = CodeEditor.getValue();
        if (!editorCode?.trim()) {
            this.showNotification('Редактор кода пуст!', true);
            return;
        }

        const conversionCheck = CodeToBlocksConverter.canConvert(editorCode);
        if (!conversionCheck.canConvert) {
            this.showNotification('Код не содержит поддерживаемых конструкций для преобразования.', true);
            return;
        }

        try {
            const success = CodeToBlocksConverter.convert(editorCode);
            if (success) {
                this.showNotification('Код успешно преобразован в блоки! 🎉');
                this.switchToBlocksMode();
                this.refreshWorkspace();
            } else {
                this.showNotification('Ошибка преобразования кода', true);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showNotification('Ошибка преобразования: ' + error.message, true);
        }
    }

    static refreshWorkspace() {
        setTimeout(() => {
            if (window.workspace?.render) {
                window.workspace.render();
            }
            console.log('Total blocks after conversion:', window.workspace?.getAllBlocks().length || 0);
        }, 500);
    }


// Modal Management
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.hideModal(modalId);
                }
            };
        }
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Utility Methods
    static showNotification(message, isError = false) {

        window.LogManager.info('UIManager', `Уведомление: ${message}`);
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${isError ? 'error' : ''}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }

    static setStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    static updateLogOutput(content) {
        const logOutput = document.getElementById('logOutput');
        if (logOutput) {
            logOutput.textContent = content;
            logOutput.scrollTop = logOutput.scrollHeight;

            if (content?.trim()) {
                this.toggleOutputPanel(true);
                window.switchOutputTab?.('log');
            }
        }
    }

    static appendLogOutput(content) {
        const logOutput = document.getElementById('logOutput');
        if (logOutput) {
            logOutput.textContent += content + '\n';
            logOutput.scrollTop = logOutput.scrollHeight;

            if (content?.trim()) {
                this.toggleOutputPanel(true);
                window.switchOutputTab?.('log');
            }
        }
    }

    static getSelectedBoard() {
        const boardSelect = document.getElementById('boardSelect');
        return boardSelect ? boardSelect.value : 'zero';
    }

    static getSelectedPort() {
        return this.selectedPort;
    }

    static toggleCodeFullscreen() {
        const codePanel = document.getElementById('codePanel');
        codePanel?.classList.toggle('fullscreen');
    }

    // Static utility methods
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

window.UIManager = UIManager;