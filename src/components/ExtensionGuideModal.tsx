import React, { useState } from 'react';
import {
  X,
  Puzzle,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Download,
  Layers,
  ShieldCheck,
  Volume2,
  Monitor,
  Globe2,
  Maximize2
} from 'lucide-react';
import { ReadingTheme } from '../types';

interface ExtensionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ReadingTheme;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'app' | 'translation' | 'extension'>('app');

  if (!isOpen) return null;

  const modalBgClasses = {
    light: 'bg-white text-slate-800 border-slate-200',
    dark: 'bg-[#181e26] text-slate-100 border-slate-700',
  }[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 sm:p-8 ${modalBgClasses}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-lg">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold flex items-center gap-2">
              Guia: App em Tela Cheia & Extensão Edge
            </h2>
            <p className="text-xs sm:text-sm opacity-75">
              Instale como aplicativo (estilo NotebookLM), use em tela cheia e integre com o Tradutor do Edge
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mb-6 border-b border-black/10 dark:border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'app'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>1. Instalar como App (NotebookLM)</span>
          </button>

          <button
            onClick={() => setActiveTab('translation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'translation'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>2. Tradução Nativa do Edge</span>
          </button>

          <button
            onClick={() => setActiveTab('extension')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'extension'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>3. Extensão do Navegador</span>
          </button>
        </div>

        {/* TAB 1: PWA APP MODE */}
        {activeTab === 'app' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-600" />
                Como rodar como App independente fora do navegador (Tela Cheia)
              </h3>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                Você pode instalar este site como um aplicativo no Windows/Mac com atalho na Área de Trabalho e Barra de Tarefas, exatamente igual ao Google Docs ou NotebookLM!
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex gap-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold">No Microsoft Edge ou Google Chrome</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    Abra a página do leitor e clique no ícone de <strong>Instalar Aplicativo</strong> na barra de endereços (ao lado da estrela de favoritos) ou clique nos três pontinhos <strong>(...)</strong> no canto superior direito.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold">Selecione "Aplicativos" (Apps) &rarr; "Instalar este site como um aplicativo"</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    Dê o nome de <strong>Audiobook Universal</strong> e marque "Fixar na barra de tarefas" e "Criar atalho na área de trabalho".
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold">Experiência Imersiva em Tela Cheia</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    O aplicativo abrirá em uma janela limpa e dedicada sem abas de navegador. Pressione o botão <strong>Tela Cheia (ou tecla F11)</strong> para uma leitura 100% livre de distrações!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSLATION */}
        {activeTab === 'translation' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-600" />
                Integração com Tradução Nativa do Navegador
              </h3>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                O leitor foi preparado para respeitar as ferramentas de tradução nativas do Microsoft Edge e Chrome sem sobrepor ou quebrar o áudio.
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                  Tradução de Páginas da Web no Edge
                </h4>
                <p className="text-xs opacity-80 leading-relaxed">
                  Quando você estiver navegando em um site em inglês/outro idioma e traduzi-lo pelo botão direito do Edge (<strong>"Traduzir para português"</strong>), basta selecionar o texto traduzido, clicar com o botão direito e escolher <strong>"Ouvir texto selecionado no Audiobook"</strong>. O aplicativo captura diretamente o texto em português resultante da tradução!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                  Tradução Direta dentro do Leitor
                </h4>
                <p className="text-xs opacity-80 leading-relaxed">
                  Se você carregar um livro em inglês no leitor, você pode clicar com o botão direito em qualquer lugar da tela e escolher <strong>"Traduzir para o português"</strong> no Edge. O texto visual da página será traduzido mantendo toda a estrutura de capítulos e formatação!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXTENSION */}
        {activeTab === 'extension' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Edge Voices banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Vozes Naturais Neurais da Microsoft (Edge)
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    Ao abrir no Microsoft Edge, as vozes <em>Francisca</em>, <em>Antonio</em> e <em>Thalita</em> ficam disponíveis diretamente no seletor de voz com qualidade humana.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex gap-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold">Abra a página de extensões</p>
                  <code className="block mt-1 p-2 rounded bg-black/10 dark:bg-black/40 text-xs font-mono select-all">
                    edge://extensions/
                  </code>
                </div>
              </div>

              <div className="flex gap-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold">Ative o Modo do Desenvolvedor e Carregue a Pasta</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    Ative a chave no menu lateral e clique em <strong>"Carregar sem compactação"</strong> selecionando a pasta <strong>dist/</strong> do projeto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
