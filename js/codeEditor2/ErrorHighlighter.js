class ErrorHighlighter {
    constructor() {
        this.markers = [];
        this.inlineMarkers = [];
        this.tooltip = this.createTooltip();
        this.errorChecker = new ErrorChecker();
        this.statusBar = document.getElementById('error-status-bar');
        this.currentEditor = null;
        this.currentIssues = [];
        this.scrollHandler = null;
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.updateTimeout = null;
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'error-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: #d32f2f;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: 'Consolas', monospace;
            z-index: 10001;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: none;
            pointer-events: none;
            border-left: 4px solid #ff6b6b;
        `;
        document.body.appendChild(tooltip);
        return tooltip;
    }

    highlightErrors(code, editorElement) {
        this.clearErrors();
        this.currentEditor = editorElement;

        const results = this.errorChecker.checkCode(code);
        this.currentIssues = [
            ...results.errors,
            ...results.warnings,
            ...results.infos
        ];

        this.displayIssues(this.currentIssues, editorElement);
        this.updateStatusBar(results);

        this.setupScrollHandler(editorElement);
        this.setupObservers(editorElement);
    }

    setupObservers(editorElement) {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.debouncedUpdateMarkers(editorElement);
        });
        this.resizeObserver.observe(editorElement);

        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldUpdate = true;
                    break;
                }
            }
            if (shouldUpdate) {
                this.debouncedUpdateMarkers(editorElement);
            }
        });

        const parentContainer = editorElement.parentNode;
        if (parentContainer) {
            this.mutationObserver.observe(parentContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    debouncedUpdateMarkers = this.debounce((editorElement) => {
        if (this.currentIssues.length > 0) {
            this.clearVisualMarkers();
            this.displayIssues(this.currentIssues, editorElement);
        }
    }, 100);

    setupScrollHandler(editorElement) {
        if (this.scrollHandler) {
            editorElement.removeEventListener('scroll', this.scrollHandler);
        }

        this.scrollHandler = this.updateMarkerPositions.bind(this, editorElement);
        editorElement.addEventListener('scroll', this.scrollHandler);
    }

    updateMarkerPositions(editorElement) {
        const scrollTop = editorElement.scrollTop;
        const scrollLeft = editorElement.scrollLeft;

        this.markers.forEach(marker => {
            const originalTop = parseInt(marker.getAttribute('data-original-top') || '0');
            marker.style.transform = `translateY(-${scrollTop}px)`;
        });

        this.inlineMarkers.forEach(marker => {
            marker.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
        });
    }

    clearVisualMarkers() {
        this.markers.forEach(marker => {
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        });
        this.markers = [];

        this.inlineMarkers.forEach(marker => {
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        });
        this.inlineMarkers = [];

        this.hideTooltip();
    }

    displayIssues(issues, editorElement) {
        const lines = editorElement.value.split('\n');
        const lineHeight = this.getLineHeight(editorElement);

        const issuesByLine = {};
        issues.forEach(issue => {
            if (!issuesByLine[issue.line]) {
                issuesByLine[issue.line] = [];
            }
            issuesByLine[issue.line].push(issue);
        });

        Object.keys(issuesByLine).forEach(lineNumber => {
            const lineIssues = issuesByLine[lineNumber];
            const lineNum = parseInt(lineNumber);

            if (lineNum <= lines.length ) {
                this.createLineMarker(lineIssues, editorElement, lineHeight, lineNum);
              //  Для инфы выпиливаем подчеркивание
                if(this.getHighestSeverity(lineIssues)!= 'info') this.createInlineMarkers(lineIssues, editorElement, lineHeight, lineNum, lines[lineNum - 1]);
            }
        });
    }

    createLineMarker(issues, editorElement, lineHeight, lineNumber) {
        const marker = document.createElement('div');
        marker.className = 'error-line-marker';

        const highestSeverity = this.getHighestSeverity(issues);
        const markerColor = this.getSeverityColor(highestSeverity);

        const paddingTop = parseInt(window.getComputedStyle(editorElement).paddingTop) || 0;
        const lineNumbersWidth = 40;
        const lineTop = (lineNumber - 1) * lineHeight + paddingTop;

        marker.style.cssText = `
            position: absolute;
            left: ${lineNumbersWidth}px;
            right: 0;
            height: ${lineHeight}px;
            background: ${markerColor}15;
            border-left: 3px solid ${markerColor};
            z-index: 1;
            cursor: pointer;
            pointer-events: auto;
            top: ${lineTop}px;
            transform: translateY(-${editorElement.scrollTop}px);
        `;

        marker.setAttribute('data-line', lineNumber);
        marker.setAttribute('data-original-top', lineTop);

        marker.addEventListener('mouseenter', (e) => {
            this.showTooltip(e, issues, markerColor);
        });

        marker.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        marker.addEventListener('click', () => {
            this.navigateToError(editorElement, lineNumber, 0);
        });

        editorElement.parentNode.appendChild(marker);
        this.markers.push(marker);
    }

    createInlineMarkers(issues, editorElement, lineHeight, lineNumber, lineText) {
        const paddingTop = parseInt(window.getComputedStyle(editorElement).paddingTop) || 0;
        const paddingLeft = parseInt(window.getComputedStyle(editorElement).paddingLeft) || 0;
        const lineNumbersWidth = 50;
        const lineTop = (lineNumber - 1) * lineHeight + paddingTop;

        issues.forEach(issue => {
            if (issue.column >= 0 && issue.column < lineText.length) {
                const marker = document.createElement('span');
                marker.className = 'error-inline-marker';

                const columnPosition = this.getColumnPosition(editorElement, issue.column, paddingLeft + lineNumbersWidth);
                const columnWidth = this.getColumnWidth(editorElement, issue.column, lineText);

                marker.style.cssText = `
                    position: absolute;
                    height: 3px;
                    background: ${this.getSeverityColor(issue.severity)};
                    bottom: 2px;
                    left: ${columnPosition + 5}px;
                    width: ${columnWidth + 2}px;
                    z-index: 2;
                    cursor: pointer;
                    pointer-events: auto;
                    border-radius: 1px;
                    top: ${lineTop + lineHeight - 4}px;
                    transform: translate(-${editorElement.scrollLeft}px, -${editorElement.scrollTop}px);
                `;

                marker.setAttribute('data-line', lineNumber);
                marker.setAttribute('data-column', issue.column);

                marker.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e, [issue], this.getSeverityColor(issue.severity));
                });

                marker.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });

                marker.addEventListener('click', () => {
                    this.navigateToError(editorElement, issue.line, issue.column);
                });

                editorElement.parentNode.appendChild(marker);
                this.inlineMarkers.push(marker);
            }
        });
    }

    getColumnPosition(editorElement, column, paddingLeft = 0) {
        const charWidth = this.getCharWidth(editorElement);
        return column * charWidth + paddingLeft;
    }

    getCharWidth(editorElement) {
        const computedStyle = window.getComputedStyle(editorElement);
        const fontSize = parseInt(computedStyle.fontSize) || 14;
        return fontSize * 0.6;
    }

    getColumnWidth(editorElement, column, lineText) {
        const charWidth = this.getCharWidth(editorElement);
        const problemText = lineText.substring(column).match(/^\w+/) || [lineText[column] || ' '];
        return problemText[0].length * charWidth;
    }

    getHighestSeverity(issues) {
        const severities = { error: 3, warning: 2, info: 1 };
        return issues.reduce((highest, issue) => {
            return severities[issue.severity] > severities[highest] ? issue.severity : highest;
        }, 'info');
    }

    getSeverityColor(severity) {
        const colors = {
            error: '#ff4444',
            warning: '#ffaa00',
            info: '#4488ff'
        };
        return colors[severity] || colors.info;
    }

    showTooltip(event, issues, color) {
        if (issues.length === 0) return;

        const tooltipContent = this.createTooltipContent(issues, color);
        this.tooltip.innerHTML = tooltipContent;
        this.tooltip.style.display = 'block';
        this.tooltip.style.background = color;

        const tooltipWidth = this.tooltip.offsetWidth;
        const tooltipHeight = this.tooltip.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = event.pageX + 15;
        let top = event.pageY + 15;

        if (left + tooltipWidth > viewportWidth) {
            left = event.pageX - tooltipWidth - 15;
        }

        if (top + tooltipHeight > viewportHeight) {
            top = event.pageY - tooltipHeight - 15;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    createTooltipContent(issues, color) {
        const severityIcons = {
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const typeLabels = {
            syntax: 'Синтаксическая ошибка',
            logic: 'Логическая ошибка',
            style: 'Стилистическая проблема',
            unused: 'Неиспользуемый код',
            arduino: 'Arduino специфика',
            quick: 'Возможная ошибка'
        };

        if (issues.length === 1) {
            const issue = issues[0];
            return `
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 14px; flex-shrink: 0;">${severityIcons[issue.severity]}</span>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">${typeLabels[issue.type] || issue.type}</div>
                        <div style="margin-bottom: 4px;">${issue.message}</div>
                        <div style="font-size: 11px; opacity: 0.8;">
                            Строка ${issue.line}, позиция ${issue.column + 1}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div style="max-height: 200px; overflow-y: auto;">
                    <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px;">
                        ${issues.length} проблем в строке ${issues[0].line}
                    </div>
                    ${issues.map(issue => `
                        <div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                <span style="font-size: 12px;">${severityIcons[issue.severity]}</span>
                                <span style="font-size: 11px; opacity: 0.9;">${typeLabels[issue.type] || issue.type}</span>
                            </div>
                            <div style="font-size: 11px;">${issue.message}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    navigateToError(editorElement, line, column) {
        const lines = editorElement.value.split('\n');
        let position = 0;

        for (let i = 0; i < line - 1; i++) {
            position += lines[i].length + 1;
        }

        position += Math.max(0, column);

        editorElement.focus();
        editorElement.setSelectionRange(position, position);

        const lineHeight = this.getLineHeight(editorElement);
        const visibleLines = Math.floor(editorElement.clientHeight / lineHeight);
        const targetLine = Math.max(0, line - Math.floor(visibleLines / 2));

        editorElement.scrollTop = targetLine * lineHeight;

        this.highlightLineTemporarily(editorElement, line);
    }

    highlightLineTemporarily(editorElement, lineNumber) {
        const lineHeight = this.getLineHeight(editorElement);
        const paddingTop = parseInt(window.getComputedStyle(editorElement).paddingTop) || 0;
        const lineTop = (lineNumber - 1) * lineHeight + paddingTop - editorElement.scrollTop;

        const highlight = document.createElement('div');
        highlight.className = 'error-highlight-temporary';
        highlight.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            height: ${lineHeight}px;
            background: rgba(255, 200, 0, 0.2);
            border: 1px solid rgba(255, 200, 0, 0.5);
            z-index: 0;
            pointer-events: none;
            top: ${lineTop}px;
        `;

        editorElement.parentNode.appendChild(highlight);

        setTimeout(() => {
            if (highlight.parentNode) {
                highlight.parentNode.removeChild(highlight);
            }
        }, 2000);
    }

    updateStatusBar(results) {
        if (!this.currentEditor || !this.currentEditor.parentNode) {
            console.warn('Editor not available for status bar update');
            return;
        }

        const errorCount = results.errors.length;
        const warningCount = results.warnings.length;
        const infoCount = results.infos.length;

        this.statusBar.innerHTML = `
            <div class="status-item ${errorCount > 0 ? 'has-errors' : ''}">
                <span class="status-icon">❌</span>
                <span class="status-count">${errorCount}</span>
                <span class="status-label">Ошибки</span>
            </div>
            <div class="status-item ${warningCount > 0 ? 'has-warnings' : ''}">
                <span class="status-icon">⚠️</span>
                <span class="status-count">${warningCount}</span>
                <span class="status-label">Предупреждения</span>
            </div>
            <div class="status-item ${infoCount > 0 ? 'has-info' : ''}">
                <span class="status-icon">ℹ️</span>
                <span class="status-count">${infoCount}</span>
                <span class="status-label">Заметки</span>
            </div>
            <div style="flex: 1;"></div>
            <div class="status-help">
                <span class="help-icon">?</span>
                <span class="help-text">Помощь</span>
            </div>
        `;

        this.addStatusBarEventListeners();
    }

    addStatusBarEventListeners() {
        const errorItem = this.statusBar.querySelector('.status-item.has-errors');
        const warningItem = this.statusBar.querySelector('.status-item.has-warnings');
        const infoItem = this.statusBar.querySelector('.status-item.has-info');
        const helpItem = this.statusBar.querySelector('.status-help');

        if (errorItem) {
            errorItem.addEventListener('click', () => {
                if (this.currentEditor) {
                    const results = this.errorChecker.checkCode(this.currentEditor.value);
                    this.navigateToNextIssue(results.errors, this.currentEditor);
                }
            });
        }

        if (warningItem) {
            warningItem.addEventListener('click', () => {
                if (this.currentEditor) {
                    const results = this.errorChecker.checkCode(this.currentEditor.value);
                    this.navigateToNextIssue(results.warnings, this.currentEditor);
                }
            });
        }

        if (infoItem) {
            infoItem.addEventListener('click', () => {
                if (this.currentEditor) {
                    const results = this.errorChecker.checkCode(this.currentEditor.value);
                    this.navigateToNextIssue(results.infos, this.currentEditor);
                }
            });
        }

        if (helpItem) {
            helpItem.addEventListener('click', () => {
                this.showErrorHelp();
            });
        }
    }

    showErrorHelp() {
        const helpMessage = `
❌ Ошибки: Критические проблемы, которые помешают компиляции кода
⚠️ Предупреждения: Потенциальные проблемы, которые стоит исправить
ℹ️ Заметки: Рекомендации по улучшению кода

Горячие клавиши:
• Ctrl+. - Следующая ошибка
• Ctrl+Shift+. - Предыдущая ошибка
• Клик на маркер - Перейти к ошибке
• Наведение на маркер - Показать описание
        `;
        alert(helpMessage);
    }

    getLineHeight(editorElement) {
        const computedStyle = window.getComputedStyle(editorElement);
        const lineHeight = parseInt(computedStyle.lineHeight) + 0.55 || 20;
        return lineHeight;
    }

    clearErrors() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        if (this.scrollHandler && this.currentEditor) {
            this.currentEditor.removeEventListener('scroll', this.scrollHandler);
        }

        this.clearVisualMarkers();
        this.currentIssues = [];
    }

    navigateToNextIssue(issues, editorElement) {
        if (issues.length === 0) return;

        const currentPosition = editorElement.selectionStart;
        const lines = editorElement.value.split('\n');

        let nextIssue = null;
        for (const issue of issues) {
            let issuePosition = 0;
            for (let i = 0; i < issue.line - 1; i++) {
                issuePosition += lines[i].length + 1;
            }
            issuePosition += issue.column;

            if (issuePosition > currentPosition) {
                nextIssue = issue;
                break;
            }
        }

        if (!nextIssue) {
            nextIssue = issues[0];
        }

        this.navigateToError(editorElement, nextIssue.line, nextIssue.column);
    }

    forceUpdateMarkers(editorElement) {
        if (!editorElement || !this.currentIssues.length) return;

        this.clearVisualMarkers();

        setTimeout(() => {
            this.displayIssues(this.currentIssues, editorElement);
        }, 10);
    }

    debounce(func, wait) {
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

    debugErrors(code) {
        const results = this.errorChecker.checkCode(code);
        console.group('🔍 Анализ кода');
        console.log('❌ Ошибки:', results.errors);
        console.log('⚠️ Предупреждения:', results.warnings);
        console.log('ℹ️ Информация:', results.infos);
        console.groupEnd();
        return results;
    }
}