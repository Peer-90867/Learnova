import React, { useState, useEffect, useRef } from 'react';
import { ViewName } from '../App';
import Layout from '../components/Layout';
import { getCurrentUser, getUploads, getCurrentDocumentId, addUsage, User, MindMap, MindMapNode, setMindMaps, getMindMaps, getCache, setCache } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, AlertCircle, Share2, Download, RefreshCw, GitBranch, Maximize2, ZoomIn, ZoomOut, Search, Palette, ChevronRight, ChevronDown, FileJson, Image as ImageIcon } from 'lucide-react';
import * as d3 from 'd3';

interface Props {
  navigate: (view: ViewName) => void;
  user: User | null;
}

export default function MindMapView({ navigate, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mindMap, setMindMap] = useState<MindMap | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeColor, setThemeColor] = useState('#8b5cf6'); // Default indigo
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const generateMindMap = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    setCollapsedIds(new Set());
    
    try {
      const uploads = getUploads().filter(u => u && u.userId === user?.id);
      if (uploads.length === 0) {
        setError('No documents found. Please upload a document first.');
        setLoading(false);
        return;
      }

      const currentDocId = getCurrentDocumentId();
      const targetUpload = currentDocId 
        ? uploads.find(u => u && u.id === currentDocId) || uploads[0]
        : uploads[0];

      // Check cache
      const cached = getCache<MindMap>(`mindmap_${targetUpload.id}`);
      if (cached) {
        setMindMap(cached);
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let promptContent = targetUpload.content || '';
      let basePrompt = `Generate a hierarchical mind map structure based on the following content. 
      The output should be a nested JSON object representing the mind map.
      Each node should have an 'id' (unique string), 'text', and 'children' (an array of nodes).
      The root node should be the main topic of the document.
      Limit to 3-4 levels deep and 3-5 children per node for clarity.
      The language of the mind map should be ${user.settings?.language || 'English'} and the tone should be ${user.settings?.tone || 'Academic'}.`;

      let contents: any = `${basePrompt}\n\nContent:\n${promptContent}`;
      
      if (promptContent.startsWith('data:')) {
        const match = promptContent.match(/^data:(.+);base64,(.*)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          contents = [
            {
              parts: [
                { text: basePrompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ];
        }
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              children: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    children: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                  }
                }
              }
            },
            required: ['id', 'text', 'children']
          }
        }
      });

      const rootNode: MindMapNode = JSON.parse(response.text || '{}');
      
      const newMindMap: MindMap = {
        id: Date.now(),
        userId: user.id,
        uploadId: targetUpload.id,
        title: `${targetUpload.filename} Mind Map`,
        root: rootNode,
        createdAt: new Date().toISOString()
      };

      setMindMap(newMindMap);
      setCache(`mindmap_${targetUpload.id}`, newMindMap);
      
      // Save to history
      const allMaps = getMindMaps();
      setMindMaps([newMindMap, ...allMaps]);
      
      addUsage('mindmap');
    } catch (err: any) {
      console.error('Failed to generate mind map', err);
      setError('Failed to generate mind map. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mindMap) {
      renderMindMap();
    }
  }, [mindMap, searchQuery, themeColor, collapsedIds]);

  const toggleNode = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderMindMap = () => {
    if (!svgRef.current || !mindMap) return;

    const width = 1000;
    const height = 800;
    const margin = { top: 50, right: 150, bottom: 50, left: 150 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior as any);

    const g = svg.append("g");

    // Process hierarchy with collapse state
    const root = d3.hierarchy(mindMap.root, (d) => {
      return collapsedIds.has(d.id) ? null : d.children;
    });

    const tree = d3.tree<MindMapNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y + margin.left)
        .y(d => d.x + margin.top))
      .attr("fill", "none")
      .attr("stroke", themeColor)
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 2);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", d => `translate(${d.y + margin.left},${d.x + margin.top})`)
      .style("cursor", d => (d.data.children && d.data.children.length > 0) ? "pointer" : "default")
      .on("click", (event, d) => {
        if (d.data.children && d.data.children.length > 0) {
          toggleNode(d.data.id);
        }
      });

    // Search matching
    const isMatch = (text: string) => searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase());

    node.append("circle")
      .attr("r", d => d.depth === 0 ? 12 : 8)
      .attr("fill", d => {
        if (isMatch(d.data.text)) return "#ef4444"; // Red for search match
        return d.depth === 0 ? themeColor : d3.color(themeColor)?.brighter(d.depth * 0.5).toString() || themeColor;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", d => isMatch(d.data.text) ? 3 : 2)
      .style("filter", d => isMatch(d.data.text) ? "drop-shadow(0 0 8px #ef4444)" : "drop-shadow(0 0 4px rgba(0,0,0,0.3))");

    // Add collapse/expand indicator
    node.filter(d => d.data.children && d.data.children.length > 0)
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text(d => collapsedIds.has(d.data.id) ? "+" : "-");

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.children ? -18 : 18)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.text)
      .attr("fill", d => isMatch(d.data.text) ? "#ef4444" : "#fff")
      .style("font-size", d => d.depth === 0 ? "16px" : "12px")
      .style("font-weight", d => (d.depth === 0 || isMatch(d.data.text)) ? "bold" : "500")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
      .style("pointer-events", "none");

    // Initial transform to center if first render
    if (!svg.attr("data-initialized")) {
      svg.call(zoomBehavior.transform as any, d3.zoomIdentity.translate(0, 0).scale(0.8));
      svg.attr("data-initialized", "true");
    }
  };

  const handleZoom = (delta: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, delta);
  };

  const exportJSON = () => {
    if (!mindMap) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mindMap, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${mindMap.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportPNG = () => {
    if (!svgRef.current || !mindMap) return;
    const svgElement = svgRef.current;
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    const width = 1000;
    const height = 800;
    clone.setAttribute('width', width.toString());
    clone.setAttribute('height', height.toString());
    
    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    const img = new Image();
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#0F0E17"; // Match background
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const a = document.createElement("a");
        a.download = `${mindMap.title.replace(/\s+/g, '_')}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  useEffect(() => {
    generateMindMap();
  }, [user?.id]);

  if (!user) return null;

  const colors = [
    { name: 'Indigo', value: '#8b5cf6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Violet', value: '#7c3aed' },
  ];

  return (
    <Layout navigate={navigate} activeView="dashboard">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              <GitBranch className="w-8 h-8 mr-3 text-indigo-400" />
              Visual Mind Map
            </h1>
            <p className="text-gray-400 mt-1">Visualize connections and hierarchy in your documents</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all w-48"
              />
            </div>
            
            <div className="flex bg-[#1A1830] p-1 rounded-xl border border-[rgba(124,58,237,0.2)]">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setThemeColor(color.value)}
                  className={`w-8 h-8 rounded-lg transition-all ${themeColor === color.value ? 'scale-110 ring-2 ring-white' : 'opacity-50 hover:opacity-100'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            <button 
              onClick={generateMindMap}
              disabled={loading}
              className="flex items-center px-4 py-2.5 bg-[#1A1830] border border-[rgba(124,58,237,0.2)] rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} 
              Regenerate
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] glass-card rounded-3xl border border-[rgba(124,58,237,0.2)]">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Analyzing document and building mind map...</p>
          </div>
        ) : error && !mindMap ? (
          <div className="flex flex-col items-center justify-center h-[600px] text-center glass-card rounded-3xl border border-red-500/20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => navigate('upload')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
            >
              Upload a Document
            </button>
          </div>
        ) : mindMap ? (
          <div className="glass-card rounded-3xl p-6 border border-[rgba(124,58,237,0.2)] relative overflow-hidden bg-[#0F0E17]">
            <div className="absolute top-6 right-6 flex gap-2 z-10">
              <button 
                onClick={() => handleZoom(1.2)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleZoom(0.8)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  if (svgRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().call(d3.zoom().transform as any, d3.zoomIdentity.translate(0, 0).scale(0.8));
                  }
                }}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-6 left-6 z-10 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/5 text-xs text-gray-400">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-white/40" />
                <span>Click nodes with children to collapse/expand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Highlighted nodes match your search</span>
              </div>
            </div>

            <div className="overflow-auto custom-scrollbar">
              <svg 
                ref={svgRef} 
                width="100%" 
                height="600" 
                viewBox="0 0 800 600"
                className="mx-auto"
              />
            </div>

            <div className="mt-6 flex justify-between items-center pt-6 border-t border-white/5">
              <div className="text-sm text-gray-500">
                Created on {new Date(mindMap.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={exportJSON}
                  className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-300 transition-colors"
                >
                  <FileJson className="w-4 h-4 mr-2" /> Export JSON
                </button>
                <button 
                  onClick={exportPNG}
                  className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-300 transition-colors"
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> Export PNG
                </button>
                <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium text-white transition-colors">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
