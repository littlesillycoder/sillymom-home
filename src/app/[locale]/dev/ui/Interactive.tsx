"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Dialog, Switch, Tabs } from "@/shared/ui";
import styles from "./page.module.css";

/** 展示頁裡需要互動的元件（勾選、開關、分頁籤、對話框）。 */
export function Interactive() {
  const t = useTranslations("devUi");
  const tUi = useTranslations("ui");
  const [line, setLine] = useState(true);
  const [sms, setSms] = useState(false);
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(true);
  const [record, setRecord] = useState(false);

  return (
    <>
      <section className={styles.section}>
        <h2>{t("checkboxes")}</h2>
        <div className={styles.stack}>
          <Checkbox
            label={t("checkFee")}
            description={t("checkFeeDesc")}
            checked={fee}
            onChange={(e) => setFee(e.target.checked)}
          />
          <Checkbox
            label={t("checkRecord")}
            description={t("checkRecordDesc")}
            checked={record}
            onChange={(e) => setRecord(e.target.checked)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("switches")}</h2>
        <div>
          <Switch label={t("switchLine")} checked={line} onChange={setLine} />
          <Switch label={t("switchSms")} checked={sms} onChange={setSms} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t("tabs")}</h2>
        <Tabs
          label={t("tabsLabel")}
          tabs={[
            { id: "video", label: t("tabVideo"), content: t("tabVideoBody") },
            { id: "home", label: t("tabHome"), content: t("tabHomeBody") },
          ]}
        />
      </section>

      <section className={styles.section}>
        <h2>{t("dialogs")}</h2>
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            {t("openDialog")}
          </Button>
        </div>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title={t("dialogTitle")}
          closeLabel={tUi("close")}
        >
          <p>{t("dialogBody")}</p>
          <Checkbox label={t("checkFee")} description={t("checkFeeDesc")} defaultChecked />
          <Checkbox label={t("checkRecord")} description={t("checkRecordDesc")} />
          <Button size="lg" fullWidth disabled>
            {t("disabled")}
          </Button>
        </Dialog>
      </section>
    </>
  );
}
