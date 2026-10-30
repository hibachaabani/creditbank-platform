/**
 * ============================================================
 * TABLEAU D'AMORTISSEMENT
 * ============================================================
 * Ce composant affiche le détail mois par mois du remboursement
 * d'un crédit bancaire.
 *
 * Principe des annuités constantes :
 *   - La MENSUALITÉ est fixe (même montant chaque mois)
 *   - Mais sa composition change chaque mois :
 *       → Au début : beaucoup d'intérêts, peu de capital
 *       → À la fin  : peu d'intérêts, beaucoup de capital
 *
 * Fonctionnalités :
 *   - Affichage dans une modal plein écran
 *   - Mise en évidence des fins d'année (mois 12, 24, 36...)
 *   - Export CSV/Excel téléchargeable
 * ============================================================
 */

import React, { useState } from 'react';
import { Eye, Download, X } from 'lucide-react';

// ─── Types des données reçues en entrée ───────────────────────────────────────
interface Props {
  capital:        number;  // Montant total emprunté (TND)
  duration:       number;  // Durée du crédit en mois
  annualRate:     number;  // Taux d'intérêt annuel en % (ex: 8.0)
  monthlyPayment: number;  // Mensualité calculée (pour affichage total)
}

// ─── Structure d'une ligne du tableau (1 ligne = 1 mois) ─────────────────────
interface Row {
  mois:             number;  // Numéro du mois (1, 2, 3...)
  mensualite:       number;  // Mensualité fixe (capital + intérêts)
  capitalRembourse: number;  // Part du capital remboursé ce mois
  interets:         number;  // Part des intérêts payés ce mois
  capitalRestant:   number;  // Capital encore dû après ce mois
}

// ─── Formatage des nombres avec 3 décimales (format tunisien) ────────────────
// Ex: 1234.567 → "1 234,567"
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — Construction du tableau d'amortissement
// ═══════════════════════════════════════════════════════════════════════════════
function buildTable(capital: number, duration: number, annualRate: number): Row[] {

  // ── Étape 1 : Calcul du taux mensuel ────────────────────────────────────────
  // Le taux annuel est divisé par 12 pour obtenir le taux mensuel
  // Ex: taux annuel 8% → taux mensuel = 8/100/12 = 0.006667
  const r = annualRate / 100 / 12;

  // ── Étape 2 : Calcul de la mensualité fixe (formule des annuités constantes) ─
  // Formule : M = C × [r × (1+r)^n] / [(1+r)^n - 1]
  //   C = capital, r = taux mensuel, n = durée en mois
  // Cette mensualité reste IDENTIQUE pendant toute la durée du crédit
  const M = capital * (r * Math.pow(1 + r, duration)) / (Math.pow(1 + r, duration) - 1);

  const rows: Row[] = [];
  let restant = capital;  // Capital restant à rembourser (diminue chaque mois)

  // ── Étape 3 : Boucle mois par mois ──────────────────────────────────────────
  for (let mois = 1; mois <= duration; mois++) {

    // Intérêts de ce mois = capital restant × taux mensuel
    // Ex mois 1 : 9000 × 0.006667 = 60.00 TND d'intérêts
    // Ex mois 2 : 8778 × 0.006667 = 58.52 TND (baisse car capital diminue)
    const interets = Math.round(restant * r * 1000) / 1000;

    // Part capital = mensualité - intérêts
    // Ex mois 1 : 281.94 - 60.00 = 221.94 TND remboursés au capital
    // Ex mois 2 : 281.94 - 58.52 = 223.42 TND (monte car moins d'intérêts)
    const capitalRembourse = Math.round((M - interets) * 1000) / 1000;

    // Nouveau capital restant après remboursement de ce mois
    // Math.max(0, ...) évite d'avoir un nombre négatif au dernier mois
    restant = Math.max(0, Math.round((restant - capitalRembourse) * 1000) / 1000);

    // Ajout de la ligne dans le tableau
    rows.push({
      mois,
      mensualite:       Math.round(M * 1000) / 1000,
      capitalRembourse,
      interets,
      capitalRestant:   restant,
    });
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION D'EXPORT CSV
// ═══════════════════════════════════════════════════════════════════════════════
// Génère un fichier CSV téléchargeable (compatible Excel)
// Le \uFEFF en début de fichier = BOM UTF-8 pour que Excel affiche les accents
function downloadCSV(rows: Row[], capital: number, annualRate: number, duration: number) {
  // En-tête du fichier CSV
  const header = 'Mois;Mensualité (TND);Capital remboursé (TND);Intérêts (TND);Capital restant (TND)\n';

  // Contenu : une ligne par mois
  const body = rows.map(r =>
    `${r.mois};${fmt(r.mensualite)};${fmt(r.capitalRembourse)};${fmt(r.interets)};${fmt(r.capitalRestant)}`
  ).join('\n');

  // Totaux en bas du fichier
  const totalInterets = rows.reduce((s, r) => s + r.interets, 0);
  const footer = `\n\n;Capital;${fmt(capital)}\n;Taux;${annualRate}%\n;Total intérêts;${fmt(totalInterets)}\n;Coût total;${fmt(capital + totalInterets)}`;

  // Création du fichier et déclenchement du téléchargement
  const blob = new Blob(['\uFEFF' + header + body + footer], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amortissement-${capital}TND-${duration}mois.csv`;
  a.click();
  URL.revokeObjectURL(url);  // libère la mémoire après téléchargement
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT REACT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export const AmortissementTable: React.FC<Props> = ({ capital, duration, annualRate, monthlyPayment }) => {

  // État d'ouverture/fermeture de la modal
  const [open, setOpen] = useState(false);

  // Construction du tableau complet (toutes les lignes)
  const rows = buildTable(capital, duration, annualRate);

  // Calcul des totaux pour la ligne récapitulative en bas
  const totalInterets = Math.round(rows.reduce((s, r) => s + r.interets, 0) * 1000) / 1000;
  const totalCapital  = Math.round(rows.reduce((s, r) => s + r.capitalRembourse, 0) * 1000) / 1000;

  return (
    <>
      {/* ── Boutons d'action ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mt-3">

        {/* Bouton pour ouvrir la modal avec le tableau */}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow"
        >
          <Eye size={16} />
          Voir le tableau d'amortissement
        </button>

        {/* Bouton pour télécharger directement sans ouvrir la modal */}
        <button
          onClick={() => downloadCSV(rows, capital, annualRate, duration)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow"
        >
          <Download size={16} />
          Télécharger CSV / Excel
        </button>
      </div>

      {/* ── Modal plein écran ─────────────────────────────────────────────────── */}
      {/* S'affiche seulement si open === true */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8"
          onClick={e => {
            // Ferme la modal si on clique sur le fond sombre (pas sur le contenu)
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4">

            {/* En-tête de la modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-slate-800 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">📊 Tableau d'amortissement</h2>
                {/* Affiche le résumé du crédit en sous-titre */}
                <p className="text-slate-300 text-sm mt-0.5">
                  {fmt(capital)} TND — {duration} mois — Taux {annualRate}%
                </p>
              </div>
              {/* Bouton fermer (×) */}
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white transition-colors p-1">
                <X size={24} />
              </button>
            </div>

            {/* ── Bloc résumé (3 chiffres clés) ──────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Capital emprunté</p>
                <p className="text-xl font-bold text-blue-700">{fmt(capital)} TND</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total intérêts</p>
                {/* Somme de tous les intérêts payés sur toute la durée */}
                <p className="text-xl font-bold text-orange-600">{fmt(totalInterets)} TND</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coût total du crédit</p>
                {/* Coût total = capital + tous les intérêts */}
                <p className="text-xl font-bold text-slate-800">{fmt(capital + totalInterets)} TND</p>
              </div>
            </div>

            {/* ── Tableau scrollable ──────────────────────────────────────────── */}
            {/* maxHeight: 60vh = le tableau occupe max 60% de la hauteur de l'écran */}
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '60vh' }}>
              <table className="w-full text-sm border-collapse">

                {/* En-têtes des colonnes — sticky = reste visible en scrollant */}
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="bg-slate-700 text-white text-center px-6 py-4 text-sm font-semibold border-r border-slate-600 w-20">
                      Mois
                    </th>
                    <th className="bg-slate-700 text-white text-right px-6 py-4 text-sm font-semibold border-r border-slate-600">
                      Mensualité
                    </th>
                    {/* Colonne bleue = part du capital remboursé */}
                    <th className="bg-blue-700 text-white text-right px-6 py-4 text-sm font-semibold border-r border-blue-600">
                      Capital remboursé
                    </th>
                    {/* Colonne orange = part des intérêts payés */}
                    <th className="bg-orange-700 text-white text-right px-6 py-4 text-sm font-semibold border-r border-orange-600">
                      Intérêts
                    </th>
                    <th className="bg-slate-700 text-white text-right px-6 py-4 text-sm font-semibold">
                      Capital restant
                    </th>
                  </tr>
                </thead>

                {/* Corps du tableau — une ligne par mois */}
                <tbody>
                  {rows.map((row, i) => {
                    // Les fins d'année (mois 12, 24, 36...) sont mises en évidence
                    const isYearEnd = row.mois % 12 === 0;

                    return (
                      <tr
                        key={row.mois}
                        className={`border-b ${
                          isYearEnd
                            ? 'bg-slate-100 border-slate-300 font-semibold'  // fin d'année → fond gris
                            : i % 2 === 0
                              ? 'bg-white border-gray-100'   // lignes paires → blanc
                              : 'bg-gray-50 border-gray-100' // lignes impaires → gris clair
                        } hover:bg-blue-50 transition-colors`}
                      >
                        {/* Numéro du mois */}
                        <td className="text-center px-6 py-3.5 border-r border-gray-100">
                          {isYearEnd ? (
                            // Badge spécial pour les fins d'année
                            <span className="inline-flex items-center justify-center bg-slate-700 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              {row.mois}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-mono">{row.mois}</span>
                          )}
                        </td>

                        {/* Mensualité — montant fixe identique chaque mois */}
                        <td className="text-right px-6 py-3.5 font-semibold text-gray-800 border-r border-gray-100 whitespace-nowrap">
                          {fmt(row.mensualite)} TND
                        </td>

                        {/* Part capital — augmente progressivement */}
                        <td className="text-right px-6 py-3.5 text-blue-700 font-medium border-r border-gray-100 whitespace-nowrap bg-blue-50/40">
                          {fmt(row.capitalRembourse)} TND
                        </td>

                        {/* Part intérêts — diminue progressivement */}
                        <td className="text-right px-6 py-3.5 text-orange-700 border-r border-gray-100 whitespace-nowrap bg-orange-50/40">
                          {fmt(row.interets)} TND
                        </td>

                        {/* Capital restant — tend vers 0 au dernier mois */}
                        <td className="text-right px-6 py-3.5 text-gray-700 whitespace-nowrap font-mono">
                          {fmt(row.capitalRestant)} TND
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Ligne totaux en bas du tableau */}
                <tfoot>
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="text-center px-6 py-4 text-sm border-r border-slate-600">TOTAL</td>
                    {/* Total payé = mensualité × durée */}
                    <td className="text-right px-6 py-4 text-sm border-r border-slate-600 whitespace-nowrap">
                      {fmt(monthlyPayment * duration)} TND
                    </td>
                    {/* Total capital = doit être égal au capital emprunté */}
                    <td className="text-right px-6 py-4 text-sm border-r border-slate-600 whitespace-nowrap text-blue-300">
                      {fmt(totalCapital)} TND
                    </td>
                    {/* Total intérêts = somme de tous les intérêts payés */}
                    <td className="text-right px-6 py-4 text-sm border-r border-slate-600 whitespace-nowrap text-orange-300">
                      {fmt(totalInterets)} TND
                    </td>
                    {/* Capital restant = 0 à la fin du crédit */}
                    <td className="text-right px-6 py-4 text-sm text-green-300 whitespace-nowrap">
                      0,000 TND
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pied de page de la modal */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => downloadCSV(rows, capital, annualRate, duration)}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                Télécharger CSV / Excel
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
