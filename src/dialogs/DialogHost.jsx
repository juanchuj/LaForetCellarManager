import { useDialog } from '@/lib/dialogs';
import { AwReadingDialog, BulkWeightDialog, DeviationDialog, EnvLogDialog, PhDialog, PieceWeightDialog, SafeDeleteDialog, SecadoStartDialog, StageDatesDialog, WeighSessionDialog } from '@/dialogs/records';
import { TastingDialog } from '@/dialogs/Tasting';
import { BatchFormDialog } from '@/dialogs/BatchForm';
import { IngredientDialog } from '@/dialogs/Ingredient';
import { AddStageDialog, HistoricalImportDialog, SyncDialog } from '@/dialogs/misc';
import { LabelDialog } from '@/dialogs/Label';
import { ConfirmHost } from '@/dialogs/ConfirmHost';

const MAP = {
  'bulk-weight': BulkWeightDialog, 'piece-weight': PieceWeightDialog, 'aw-reading': AwReadingDialog, 'secado-start': SecadoStartDialog,
  'stage-dates': StageDatesDialog, ph: PhDialog, 'env-log': EnvLogDialog, 'weigh-session': WeighSessionDialog, deviation: DeviationDialog,
  'safe-delete': SafeDeleteDialog, tasting: TastingDialog, 'batch-form': BatchFormDialog, ingredient: IngredientDialog, 'add-stage': AddStageDialog, sync: SyncDialog, 'historical-import': HistoricalImportDialog, label: LabelDialog,
};

export function DialogHost() {
  const d = useDialog();
  const C = d && MAP[d.name];
  return (
    <>
      {C && <C key={d.key} {...d.props} />}
      <ConfirmHost />
    </>
  );
}
