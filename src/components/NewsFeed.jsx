import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Newspaper } from 'lucide-react';

export default function NewsFeed({ articles = [], cityName = '', loading = false }) {
  return (
    <div className="bg-bg-card border border-[#ffffff12] rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-semantic-blue" />
          <h2 className="text-sm font-semibold text-primary">
            {cityName ? `${cityName} News` : 'City News'}
          </h2>
        </div>
        <span className="text-[10px] font-mono text-primary-muted">
          Google News · LIVE
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[90px] rounded-lg bg-bg-inner animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-[12px] text-primary-muted py-4 text-center">No articles found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {articles.map((article, i) => (
            <motion.a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-[#ffffff0a] bg-bg-inner hover:bg-bg-inner/80 hover:border-semantic-blue/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-[11px] font-medium leading-snug text-primary line-clamp-3 flex-1">
                  {article.title}
                </p>
                <ExternalLink
                  size={10}
                  className="text-primary-muted group-hover:text-semantic-blue transition-colors mt-0.5 shrink-0"
                />
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[9px] font-mono text-semantic-blue truncate max-w-[70%]">
                  {article.source}
                </span>
                <span className="text-[9px] font-mono text-primary-muted shrink-0">
                  {article.time}
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
