import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useRouteTemplates, useBulkCreateTrackedParts } from '../../hooks/usePartsTracking';
import { useToast } from '../../contexts/ToastContext';
import type { BomItem, IdentificationType } from '../../../../shared/types';
import type { PdfPartMatch } from '../../services/engineering.service';

interface BomItemRow {
  bomItem: BomItem;
  checked: boolean;
  quantity: number;
  routeTemplateId: string;
  pdfMatched?: boolean;
  pdfQuantity?: number;
  scrappedPartIds?: number[];
}

interface InitializePartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  workOrderId: number;
  woNumber: string;
  bomItems: BomItem[];
  pdfMatches?: PdfPartMatch[];
  isRecut?: boolean;
}

export default function InitializePartsModal({
  isOpen,
  onClose,
  jobId,
  workOrderId,
  woNumber,
  bomItems,
  pdfMatches,
  isRecut,
}: InitializePartsModalProps) {
  const toast = useToast();
  const { data: templates } = useRouteTemplates();
  const bulkCreate = useBulkCreateTrackedParts(jobId);

  const [rows, setRows] = useState<BomItemRow[]>([]);
  const [identificationType, setIdentificationType] = useState<IdentificationType>('Other');
  const [trackingIdPrefix, setTrackingIdPrefix] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // When PDF was parsed, only include BOM items that matched the PDF.
      // This prevents assigning parts to a WO that aren't actually on its PDF.
      const matchedBomIds = new Set(
        pdfMatches?.filter((m) => m.matched).map((m) => m.bomItemId) || []
      );
      const hasPdfMatches = pdfMatches && pdfMatches.length > 0;

      const itemsToShow = hasPdfMatches
        ? bomItems.filter((item) => matchedBomIds.has(item.id))
        : bomItems;

      setRows(
        itemsToShow.map((item) => {
          const pdfMatch = pdfMatches?.find((m) => m.bomItemId === item.id && m.matched);
          return {
            bomItem: item,
            checked: hasPdfMatches ? true : false,
            quantity: pdfMatch ? pdfMatch.pdfQuantity : item.quantity,
            routeTemplateId: item.routeTemplateId ? String(item.routeTemplateId) : '',
            pdfMatched: !!pdfMatch,
            pdfQuantity: pdfMatch?.pdfQuantity,
            scrappedPartIds: pdfMatch?.scrappedPartIds || [],
          };
        })
      );
      setIdentificationType('Other');
      setTrackingIdPrefix('');
      setIsSubmitting(false);
    }
  }, [isOpen, bomItems, pdfMatches]);

  const checkedCount = rows.filter((r) => r.checked).length;

  const toggleAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, checked })));
  };

  const updateRow = (index: number, updates: Partial<BomItemRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const updateRouteForChecked = (index: number, routeTemplateId: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i === index) return { ...r, routeTemplateId };
        if (r.checked) return { ...r, routeTemplateId };
        return r;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = rows.filter((r) => r.checked && r.quantity > 0);
    if (selected.length === 0) {
      toast.warning('Select at least one BOM item');
      return;
    }

    setIsSubmitting(true);
    let totalCreated = 0;

    try {
      for (const row of selected) {
        const prefix = trackingIdPrefix
          ? `${trackingIdPrefix}-${row.bomItem.partNumber}`
          : row.bomItem.partNumber;

        const result = await bulkCreate.mutateAsync({
          bomItemId: row.bomItem.id,
          workOrderId,
          quantity: row.quantity,
          routeTemplateId: row.routeTemplateId ? Number(row.routeTemplateId) : undefined,
          identificationType,
          trackingIdPrefix: prefix || undefined,
          partNumber: row.bomItem.partNumber || undefined,
          description: row.bomItem.description || undefined,
          recutFromIds: isRecut && row.scrappedPartIds && row.scrappedPartIds.length > 0
            ? row.scrappedPartIds
            : undefined,
        });
        totalCreated += result.parts.length;
      }

      toast.success(`${totalCreated} parts initialized for ${woNumber}`);
      onClose();
    } catch (error) {
      toast.error('Failed to initialize parts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unmatchedPdfParts = pdfMatches?.filter((m) => !m.matched) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Initialize Parts for ${woNumber}`} maxWidth="5xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recut WO banner */}
        {isRecut && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-sm text-orange-500">
              <strong>Recut Work Order</strong> — New parts will be linked to their original scrapped parts automatically.
              {rows.filter(r => r.scrappedPartIds && r.scrappedPartIds.length > 0).length > 0 && (
                <span className="ml-2">
                  {rows.filter(r => r.scrappedPartIds && r.scrappedPartIds.length > 0).length} item(s) matched to scrapped parts.
                </span>
              )}
            </p>
          </div>
        )}

        {/* PDF match summary */}
        {pdfMatches && pdfMatches.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              PDF parsed: {pdfMatches.filter(m => m.matched).length} of {pdfMatches.length} parts matched to BOM.
              Only matched parts are shown below.
              {unmatchedPdfParts.length > 0 && (
                <span className="text-amber-600 ml-2">
                  Not in BOM: {unmatchedPdfParts.map(p => p.pdfPartName).join(', ')}
                </span>
              )}
            </p>
          </div>
        )}

        {/* BOM Items Checklist */}
        {bomItems.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No BOM items found for this job. Add BOM items first.
          </p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={checkedCount === rows.length && rows.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="rounded border-gray-200"
                    />
                  </th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider font-medium text-gray-400">Part Number</th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                  <th className="p-3 text-center text-[11px] uppercase tracking-wider font-medium text-gray-400 w-20">BOM Qty</th>
                  <th className="p-3 text-center text-[11px] uppercase tracking-wider font-medium text-gray-400 w-20">WO Qty</th>
                  <th className="p-3 text-center text-[11px] uppercase tracking-wider font-medium text-gray-400 w-24">Parts to Create</th>
                  <th className="p-3 text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 min-w-[200px]">Route Template</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.bomItem.id}
                    className={`border-b border-gray-50 ${row.checked ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) => updateRow(index, { checked: e.target.checked })}
                        className="rounded border-gray-200"
                      />
                    </td>
                    <td className="p-3 text-gray-900 font-mono">
                      {row.bomItem.partNumber}
                      {row.pdfMatched && (
                        <span className="ml-2 text-[10px] font-medium text-blue-500">
                          PDF
                        </span>
                      )}
                      {row.scrappedPartIds && row.scrappedPartIds.length > 0 && (
                        <span className="ml-2 text-[10px] font-medium text-orange-500">
                          {row.scrappedPartIds.length} recut{row.scrappedPartIds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {row.bomItem.description || '-'}
                    </td>
                    <td className="p-3 text-center text-gray-600">{row.bomItem.quantity}</td>
                    <td className="p-3 text-center">
                      {row.pdfMatched && row.pdfQuantity !== undefined ? (
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          row.pdfQuantity === row.bomItem.quantity
                            ? 'text-emerald-500'
                            : 'text-amber-500'
                        }`}>
                          {row.pdfQuantity}
                          {row.pdfQuantity === row.bomItem.quantity ? (
                            <span className="text-[10px]" title="WO qty matches BOM qty">&#10003;</span>
                          ) : (
                            <span className="text-[10px]" title={`WO qty (${row.pdfQuantity}) differs from BOM qty (${row.bomItem.quantity})`}>&#9888;</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={row.quantity}
                        onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                        disabled={!row.checked}
                        className="w-20 text-center bg-white border border-gray-100 rounded px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-40"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={row.routeTemplateId}
                        onChange={(e) => updateRouteForChecked(index, e.target.value)}
                        disabled={!row.checked}
                        className="w-full bg-white border border-gray-100 rounded px-2 py-1 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-40"
                      >
                        <option value="">-- No route --</option>
                        {templates?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.stepCount} steps)
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Global Settings */}
        {bomItems.length > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
              <select
                value={identificationType}
                onChange={(e) => setIdentificationType(e.target.value as IdentificationType)}
                className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="QR">QR Code</option>
                <option value="Engraved">Engraved</option>
                <option value="Sticker">Sticker</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID Prefix</label>
              <input
                type="text"
                value={trackingIdPrefix}
                onChange={(e) => setTrackingIdPrefix(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="e.g., WO-001 (optional)"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || checkedCount === 0}
            className="btn-primary disabled:opacity-50"
          >
            {isSubmitting
              ? 'Initializing...'
              : `Initialize Parts (${checkedCount} item${checkedCount !== 1 ? 's' : ''})`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
