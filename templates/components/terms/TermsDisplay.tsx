import React from 'react';
import ReactMarkdown from 'react-markdown';

interface TermsDisplayProps {
  content: string;
  version: string;
  effectiveDate: Date;
}

/**
 * Displays terms of service content with version and effective date
 * Renders markdown content with appropriate styling
 */
export function TermsDisplay({ content, version, effectiveDate }: TermsDisplayProps) {
  return (
    <div className="max-w-none">
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-700">Version:</span> {version}
          </div>
          <div>
            <span className="font-medium text-gray-700">Effective Date:</span>{' '}
            {new Date(effectiveDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:my-4 prose-li:text-gray-700">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
