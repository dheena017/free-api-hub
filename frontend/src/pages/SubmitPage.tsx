import React, { useState } from 'react';
import { validateEndpoint, submitApi, fetchSubmissionStatus, fetchApis } from '../api/client';
import { ValidationResult, AuthType, PricingTier } from '../types/api';
import {
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  ShieldAlert,
  Send,
  Loader2,
  Zap,
  Search,
  Clock,
  Copy,
  Check,
  FileText,
  ExternalLink
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../components/ui';

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'developer-tools', label: 'Developer Tools & Utilities' },
  { value: 'ai-ml', label: 'AI & Machine Learning' },
  { value: 'database', label: 'Databases & BaaS' },
  { value: 'cloud-storage', label: 'Cloud & Object Storage' },
  { value: 'devops-ci', label: 'DevOps, CI/CD & Monitoring' },
  { value: 'security', label: 'Security, Auth & Cryptography' },
  { value: 'communication', label: 'Communication, SMS & Email' },
  { value: 'productivity', label: 'Productivity & Workspace' },
  { value: 'finance', label: 'Finance & FinTech' },
  { value: 'crypto-web3', label: 'Crypto & Web3' },
  { value: 'ecommerce', label: 'E-Commerce & Payments' },
  { value: 'weather', label: 'Weather & Climate' },
  { value: 'geography', label: 'Geography & Maps' },
  { value: 'science', label: 'Science & Astronomy' },
  { value: 'reference', label: 'Reference & Dictionaries' },
  { value: 'news', label: 'News & Feeds' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'gaming', label: 'Gaming & Game Data' },
  { value: 'entertainment', label: 'Entertainment & Media' },
  { value: 'music-audio', label: 'Music & Audio' },
  { value: 'video-streaming', label: 'Video & Streaming' },
  { value: 'social-media', label: 'Social Media & Networks' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'health-fitness', label: 'Health & Medical' },
  { value: 'government-open-data', label: 'Government & Open Data' }
];

const AUTH_OPTIONS: SelectOption<AuthType>[] = [
  { value: 'none', label: 'No Key Required (Completely Open)', description: 'Instant access without keys or auth headers' },
  { value: 'api_key', label: 'Free API Key', description: 'Requires signup for a free token or key' },
  { value: 'oauth', label: 'OAuth 2.0', description: 'Requires client credentials / user authorization' }
];

const PRICING_OPTIONS: SelectOption<PricingTier>[] = [
  { value: 'open', label: '100% Free / Open Source', description: 'Completely free with no credit card ever' },
  { value: 'free_forever', label: 'Free Forever (Rate Limited)', description: 'Permanent free tier with request limits' },
  { value: 'freemium_no_cc', label: 'Freemium (Zero CC Required)', description: 'Generous free quota without entering payment info' }
];

export const SubmitPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'developer-tools',
    base_url: '',
    endpoint: '',
    documentation_url: '',
    auth_type: 'none' as AuthType,
    pricing_tier: 'open' as PricingTier,
    description: '',
    detailed_description: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tab & Tracking State
  const [pageTab, setPageTab] = useState<'submit' | 'track'>('submit');
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [copiedSubId, setCopiedSubId] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = async (idToLookup?: string) => {
    const targetId = (idToLookup || lookupId).trim();
    if (!targetId) return;
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const data = await fetchSubmissionStatus(targetId);
      setLookupResult(data);
    } catch (err: unknown) {
      setLookupResult(null);
      setLookupError(err instanceof Error ? err.message : 'Submission not found or invalid ID');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleQuickFillFromCatalog = async () => {
    setIsLookingUp(true);
    try {
      const res = await fetchApis({ limit: 12, sort: 'popular' });
      if (res.items.length > 0) {
        const item = res.items[Math.floor(Math.random() * res.items.length)];
        setFormData({
          name: item.name,
          category: item.category,
          base_url: item.base_url,
          endpoint: item.endpoint,
          documentation_url: item.documentation_url,
          auth_type: item.auth_type,
          pricing_tier: item.pricing_tier,
          description: item.description,
          detailed_description: item.detailed_description || item.description
        });
      }
    } catch (err) {
      console.error('Failed to load sample API from catalog:', err);
    } finally {
      setIsLookingUp(false);
      setFieldErrors({});
      setValidationResult(null);
      setSubmitError(null);
    }
  };

  const validateUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleValidate = async () => {
    const errors: Record<string, string> = {};
    if (!formData.base_url.trim()) {
      errors.base_url = 'Base URL is required to run live validation.';
    } else if (!validateUrl(formData.base_url.trim())) {
      errors.base_url = 'Base URL must start with http:// or https:// (e.g. https://api.example.com).';
    }

    if (!formData.endpoint.trim()) {
      errors.endpoint = 'GET endpoint path is required (e.g. /v1/status or /fact).';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      setValidationResult({
        is_valid: false,
        status_code: 0,
        latency_ms: 0,
        message: 'Validation pre-flight failed: Please enter a valid Base URL and Sample Endpoint path before testing.'
      });
      return;
    }

    // Clear these field errors
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.base_url;
      delete next.endpoint;
      return next;
    });

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateEndpoint({
        base_url: formData.base_url.trim(),
        endpoint: formData.endpoint.trim(),
        method: 'GET'
      });
      setValidationResult(result);
      if (result.is_valid) {
        setSubmitError(null);
      }
    } catch (err: unknown) {
      setValidationResult({
        is_valid: false,
        status_code: 0,
        latency_ms: 0,
        message: err instanceof Error ? err.message : 'Validation request failed'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'API Name is required.';
    }
    if (!formData.category) {
      errors.category = 'Please choose a category.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Please provide a description for the catalog card.';
    }
    if (!formData.documentation_url.trim()) {
      errors.documentation_url = 'Official Documentation URL is required.';
    } else if (!validateUrl(formData.documentation_url.trim())) {
      errors.documentation_url = 'Documentation URL must be a valid http:// or https:// address.';
    }
    if (!formData.base_url.trim()) {
      errors.base_url = 'Base URL is required.';
    }
    if (!formData.endpoint.trim()) {
      errors.endpoint = 'GET endpoint path is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Please complete all required fields with valid values before submitting.');
      return;
    }

    if (!validationResult?.is_valid) {
      setSubmitError(
        'Live verification required: You must click "Validate Endpoint Live" and ensure your sample endpoint responds with HTTP 200 OK before submitting to the catalog.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitApi({
        name: formData.name.trim(),
        category: formData.category,
        base_url: formData.base_url.trim(),
        endpoint: formData.endpoint.trim(),
        documentation_url: formData.documentation_url.trim(),
        auth_type: formData.auth_type,
        pricing_tier: formData.pricing_tier,
        description: formData.description.trim()
      });
      if (res.submission_id) {
        setLastSubmittedId(res.submission_id);
      }
      setSubmissionSuccess(true);
      setFieldErrors({});
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'API Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-accent text-xs font-mono font-semibold uppercase tracking-wider">
          <PlusCircle className="h-4 w-4" />
          <span>Community Directory Pipeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Community API Hub</h1>
        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
          Help expand the world's most reliable free API catalog. Submissions undergo pre-flight live validation and persistent automated health verification.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3C4043] gap-6">
        <button
          onClick={() => setPageTab('submit')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            pageTab === 'submit'
              ? 'border-[#8AB4F8] text-[#8AB4F8]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit an API</span>
        </button>
        <button
          onClick={() => setPageTab('track')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            pageTab === 'track'
              ? 'border-[#8AB4F8] text-[#8AB4F8]'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Track Submission Status</span>
        </button>
      </div>

      {pageTab === 'track' ? (
        <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-[#8AB4F8]" />
              <span>Lookup Submission by ID</span>
            </h2>
            <p className="text-xs text-slate-400">
              Enter your tracking identifier (e.g. <span className="font-mono text-slate-300">sub_...</span>) to check automated moderation and catalog intake status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="sub_xxxxxxxxxxxx"
              className="flex-1 bg-[#1F1F1F] border border-[#3C4043] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#8AB4F8]"
            />
            <button
              onClick={() => handleLookup()}
              disabled={isLookingUp || !lookupId.trim()}
              className="px-4 py-2 bg-[#8AB4F8] hover:bg-[#A8C7FA] disabled:opacity-50 text-xs font-semibold text-[#1F1F1F] rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>{isLookingUp ? 'Checking...' : 'Check Status'}</span>
            </button>
          </div>

          {lookupError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {lookupResult && (
            <div className="p-5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3C4043]">
                <div>
                  <div className="text-[11px] font-mono uppercase text-slate-400">Tracking Reference</div>
                  <div className="text-sm font-mono font-bold text-white">{lookupResult.id}</div>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      lookupResult.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : lookupResult.status === 'rejected'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>
                      {lookupResult.status === 'pending_review'
                        ? 'In Queue (Pending Review)'
                        : lookupResult.status.toUpperCase()}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">API Name:</span>
                  <p className="font-semibold text-white mt-0.5">{lookupResult.name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Category:</span>
                  <p className="font-mono text-slate-200 mt-0.5">{lookupResult.category}</p>
                </div>
                <div>
                  <span className="text-slate-400">Base URL:</span>
                  <p className="font-mono text-[#8AB4F8] mt-0.5 truncate">{lookupResult.base_url}</p>
                </div>
                <div>
                  <span className="text-slate-400">Endpoint Path:</span>
                  <p className="font-mono text-slate-300 mt-0.5">{lookupResult.endpoint}</p>
                </div>
                <div>
                  <span className="text-slate-400">Submission Timestamp:</span>
                  <p className="text-slate-300 mt-0.5 font-mono">{new Date(lookupResult.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Automated Bot Validation:</span>
                  <p className="text-emerald-400 mt-0.5 font-semibold">Verified Live (HTTP 200 OK)</p>
                </div>
              </div>

              {lookupResult.review_notes && (
                <div className="p-3 bg-[#28292A] rounded-lg border border-[#3C4043] text-xs space-y-1">
                  <span className="font-medium text-slate-300">Moderation Notes:</span>
                  <p className="text-slate-400">{lookupResult.review_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : submissionSuccess ? (
        <div className="bg-[#28292A] rounded-2xl p-8 border border-[#3C4043] text-center space-y-5">
          <div className="h-12 w-12 rounded-full bg-[#1F1F1F] border border-[#3C4043] text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">API Successfully Submitted!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your endpoint has been placed into our automated verification queue. Once verified by our daily health bot, it will appear publicly in the directory.
            </p>
          </div>

          {lastSubmittedId && (
            <div className="max-w-md mx-auto p-3.5 bg-[#1F1F1F] rounded-xl border border-[#3C4043] flex items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Your Tracking Reference</span>
                <div className="text-xs font-mono font-bold text-[#8AB4F8]">{lastSubmittedId}</div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lastSubmittedId);
                  setCopiedSubId(true);
                  setTimeout(() => setCopiedSubId(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28292A] hover:bg-[#3C4043] border border-[#3C4043] text-xs font-medium text-slate-200 transition-colors"
              >
                {copiedSubId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSubId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {lastSubmittedId && (
              <button
                onClick={() => {
                  setLookupId(lastSubmittedId);
                  setPageTab('track');
                  handleLookup(lastSubmittedId);
                }}
                className="px-4 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-xs font-semibold text-[#1F1F1F] transition-colors"
              >
                Track This Submission
              </button>
            )}
            <button
              onClick={() => {
                setSubmissionSuccess(false);
                setValidationResult(null);
                setFormData({
                  name: '',
                  category: 'weather',
                  base_url: '',
                  endpoint: '',
                  documentation_url: '',
                  auth_type: 'none',
                  pricing_tier: 'open',
                  description: '',
                  detailed_description: ''
                });
              }}
              className="px-4 py-2 rounded-lg bg-[#303134] border border-[#3C4043] text-xs text-slate-200 hover:text-white hover:bg-[#3C4043] font-medium transition-colors"
            >
              Submit Another API
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Demo Pre-fill Bar */}
          <div className="bg-[#28292A] rounded-2xl p-4 border border-[#3C4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Zap className="h-4 w-4 text-[#8AB4F8]" />
              <span>Testing the verification pipeline? Load a real sample from our verified catalog:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLookingUp}
                onClick={handleQuickFillFromCatalog}
                className="px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#3C4043] border border-[#3C4043] text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>{isLookingUp ? 'Fetching from Catalog...' : 'Load Catalog Sample'}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#28292A] rounded-2xl p-6 sm:p-8 border border-[#3C4043] space-y-6">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-[#3C4043] pb-3">
              1. API Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  API Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Open-Meteo Weather"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  className={`w-full bg-[#1F1F1F] border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none transition-colors ${
                    fieldErrors.name
                      ? 'border-rose-500 ring-1 ring-rose-500/30'
                      : 'border-[#3C4043] focus:border-[#8AB4F8]'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <CustomSelect
                  label="Category *"
                  value={formData.category}
                  onChange={(val) => {
                    setFormData({ ...formData, category: val });
                    if (fieldErrors.category) setFieldErrors({ ...fieldErrors, category: '' });
                  }}
                  options={CATEGORY_OPTIONS}
                  searchable
                  variant="default"
                  size="md"
                  error={fieldErrors.category}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Description *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Shown on API cards & search</span>
              </div>
              <textarea
                rows={2}
                placeholder="Punchy 1-2 sentence summary of what this API provides (e.g. Accurate global weather forecast without API keys)..."
                value={formData.description}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    description: e.target.value
                  });
                  if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: '' });
                }}
                className={`w-full bg-[#1F1F1F] border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none transition-colors ${
                  fieldErrors.description
                    ? 'border-rose-500 ring-1 ring-rose-500/30'
                    : 'border-[#3C4043] focus:border-[#8AB4F8]'
                }`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{fieldErrors.description}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Detailed Description (Full Overview)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Shown on API Detail Page</span>
              </div>
              <textarea
                rows={4}
                placeholder="Comprehensive technical overview: explain key features, response formats, rate limits, and common developer use cases..."
                value={formData.detailed_description}
                onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                className="w-full bg-[#1F1F1F] border border-[#3C4043] rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-[#8AB4F8] focus:outline-none transition-colors leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Official Documentation URL *
              </label>
              <input
                type="url"
                placeholder="https://docs.example.com"
                value={formData.documentation_url}
                onChange={(e) => {
                  setFormData({ ...formData, documentation_url: e.target.value });
                  if (fieldErrors.documentation_url) setFieldErrors({ ...fieldErrors, documentation_url: '' });
                }}
                className={`w-full bg-[#1F1F1F] border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none transition-colors ${
                  fieldErrors.documentation_url
                    ? 'border-rose-500 ring-1 ring-rose-500/30'
                    : 'border-[#3C4043] focus:border-[#8AB4F8]'
                }`}
              />
              {fieldErrors.documentation_url && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{fieldErrors.documentation_url}</span>
                </p>
              )}
            </div>

            {/* Auth & Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <CustomSelect
                  label="Authentication Type *"
                  value={formData.auth_type}
                  onChange={(val) => setFormData({ ...formData, auth_type: val as AuthType })}
                  options={AUTH_OPTIONS}
                  variant="default"
                  size="md"
                />
              </div>

              <div>
                <CustomSelect
                  label="Free Tier Policy *"
                  value={formData.pricing_tier}
                  onChange={(val) => setFormData({ ...formData, pricing_tier: val as PricingTier })}
                  options={PRICING_OPTIONS}
                  variant="default"
                  size="md"
                />
              </div>
            </div>

            {/* Section 2: Live Pre-Validation */}
            <div className="pt-4 border-t border-[#3C4043] space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Play className="h-3.5 w-3.5 text-[#8AB4F8]" />
                <span>2. Live Endpoint Pre-Validator (Mandatory)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Enter the Base URL and sample GET path. We will send a live probe right now to confirm it responds with <code className="text-emerald-400">200 OK</code>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.example.com"
                    value={formData.base_url}
                    onChange={(e) => {
                      setFormData({ ...formData, base_url: e.target.value });
                      if (fieldErrors.base_url) setFieldErrors({ ...fieldErrors, base_url: '' });
                    }}
                    className={`w-full bg-[#1F1F1F] border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors ${
                      fieldErrors.base_url
                        ? 'border-rose-500 ring-1 ring-rose-500/30'
                        : 'border-[#3C4043] focus:border-[#8AB4F8]'
                    }`}
                  />
                  {fieldErrors.base_url && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>{fieldErrors.base_url}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    GET Endpoint Path *
                  </label>
                  <input
                    type="text"
                    placeholder="/v1/status or /fact"
                    value={formData.endpoint}
                    onChange={(e) => {
                      setFormData({ ...formData, endpoint: e.target.value });
                      if (fieldErrors.endpoint) setFieldErrors({ ...fieldErrors, endpoint: '' });
                    }}
                    className={`w-full bg-[#1F1F1F] border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none transition-colors ${
                      fieldErrors.endpoint
                        ? 'border-rose-500 ring-1 ring-rose-500/30'
                        : 'border-[#3C4043] focus:border-[#8AB4F8]'
                    }`}
                  />
                  {fieldErrors.endpoint && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>{fieldErrors.endpoint}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Validate Trigger Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#303134] hover:bg-[#3C4043] text-xs font-medium text-[#8AB4F8] border border-[#3C4043] transition-colors disabled:opacity-50"
                >
                  {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  <span>{isValidating ? 'Validating Endpoint Live...' : 'Validate Endpoint Live'}</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Sends an authentic HTTP probe to confirm zero-downtime reliability
                </span>
              </div>

              {/* Validation Result Box */}
              {validationResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    validationResult.is_valid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {validationResult.is_valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span>
                      {validationResult.is_valid
                        ? `Live Validation Passed (HTTP ${validationResult.status_code} in ${validationResult.latency_ms}ms)`
                        : `Validation Failed (HTTP ${validationResult.status_code || 'Connection Failed'})`}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{validationResult.message}</p>

                  {/* Diagnostic hints for failed validation */}
                  {!validationResult.is_valid && (
                    <div className="bg-[#1F1F1F] p-3 rounded-lg border border-[#3C4043] space-y-1.5 text-slate-300 font-sans">
                      <span className="font-semibold text-slate-200 block text-[11px]">
                        Diagnostic Guidance:
                      </span>
                      {validationResult.status_code === 401 && (
                        <p className="text-[11px] text-slate-400">
                          The target endpoint rejected the request with HTTP 401 Unauthorized. To list in the free directory, please specify an open public endpoint (e.g. status check, ping, public demo) that responds without private keys.
                        </p>
                      )}
                      {validationResult.status_code === 403 && (
                        <p className="text-[11px] text-slate-400">
                          The target host refused connection (HTTP 403 Forbidden). Check whether Cloudflare challenge or domain whitelisting is blocking external automated health checks.
                        </p>
                      )}
                      {validationResult.status_code === 404 && (
                        <p className="text-[11px] text-slate-400">
                          The sample path was not found on this base URL (HTTP 404). Ensure the sample path includes any required version prefix (e.g. /v1/status instead of /status).
                        </p>
                      )}
                      {validationResult.status_code === 0 && (
                        <p className="text-[11px] text-slate-400">
                          Connection timed out or DNS resolution failed. Verify the Base URL domain name and ensure https:// is reachable.
                        </p>
                      )}
                    </div>
                  )}

                  {Boolean(validationResult.sample_data) && (
                    <div className="mt-2 bg-[#1F1F1F] p-2.5 rounded-lg border border-[#3C4043] font-mono text-[11px] max-h-32 overflow-auto text-slate-300">
                      <pre>{JSON.stringify(validationResult.sample_data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block text-rose-200">Submission Blocked</span>
                  <p className="leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#3C4043] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {!validationResult?.is_valid
                  ? '⚠️ Requires successful live pre-validation before submitting'
                  : '✅ Endpoint verified and ready for catalog inclusion'}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !validationResult?.is_valid}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{isSubmitting ? 'Submitting...' : 'Submit Verified API'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
