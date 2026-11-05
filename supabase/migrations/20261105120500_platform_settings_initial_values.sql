-- #10 平台設定的初始值（沿用 #4 建立的 platform_settings，不另建）
--
-- 來源：設計稿 AdminSettings（後台 6：平台設定）、docs/技術決定.md 第 3 節。
-- 程式一律從這裡讀，不寫死。後台「平台設定」頁（#41）可以修改。
-- 代號帶單位（_hours、_minutes、_days、_months、_count），金額用 amount＋currency（#5 規則）。
--
-- 設計稿寫 [N] 的不放（要等律師、會計師確認，或在各自的 issue 決定）：
-- 證件照片保存天數、交易與發票紀錄保存年限、公開求助自動結束、直接到府師傅回覆時限、申請未通過可重新申請天數。
-- 積分、推薦排序的數字在 #59、#49 再放。

insert into public.platform_settings (key, amount, currency, description) values
  -- 客戶收費
  ('customer_request_fee', 100, 'TWD', '平台費（求助）：每個求助，含可視訊次數'),
  ('customer_urgent_fee', 100, 'TWD', '平台費（急件）：核對碼確認時扣款'),
  ('customer_direct_home_fee', 100, 'TWD', '平台費（直接預約到府）：核對碼確認時扣款'),
  ('customer_late_cancel_fee', 100, 'TWD', '逾時費（臨時取消）：到府前期限內取消'),
  ('customer_late_reschedule_fee', 50, 'TWD', '逾時費（臨時改期）：到府前期限內改期'),
  ('customer_no_answer_fee', 100, 'TWD', '逾時費（沒人開門）：師傅等候後沒人開門'),
  -- 師傅收費
  ('tech_listing_review_fee', 300, 'TWD', '上架審核費：審核通過才扣款，只收一次'),
  ('tech_video_service_fee', 150, 'TWD', '平台服務費（視訊）：每次視訊滿收費門檻'),
  ('tech_direct_home_service_fee', 150, 'TWD', '平台服務費（直接預約到府）：核對碼確認時扣款'),
  ('tech_video_no_show_penalty', 100, 'TWD', '缺席罰款：視訊缺席（期限內取消或遲到）'),
  -- 抵用金（給師傅）
  ('credit_not_selected_amount', 50, 'TWD', '抵用金：沒拿到這個案子'),
  ('credit_solved_in_video_amount', 100, 'TWD', '抵用金：客戶確認問題已在視訊中解決');

insert into public.platform_settings (key, int_value, description) values
  -- 求助
  ('request_video_count', 2, '一個求助可視訊次數（可以找同一位或換一位師傅）'),
  ('request_valid_hours', 24, '求助有效時間：從第 1 次視訊起算，到期扣款'),
  ('request_second_video_reminder_hours', 2, '第 2 次視訊到期提醒：到期前幾小時'),
  ('urgent_window_hours', 12, '急件的範圍：預約後幾小時內到府'),
  -- 師傅
  ('tech_new_free_video_count', 1, '新師傅免費視訊次數（加入後）'),
  -- 抵用金
  ('credit_clawback_days', 7, '抵用金收回：同一個問題在幾天內預約到府（不論哪位師傅）'),
  ('credit_valid_months', 3, '抵用金有效期限（月）'),
  -- 視訊
  ('video_max_minutes', 10, '視訊時長上限：雙方上線後開始計時'),
  ('video_billable_minutes', 3, '收費門檻：視訊滿這個時間才算一次'),
  ('video_late_cancel_minutes', 5, '視訊遲到判定：超過就取消'),
  ('video_free_cancel_hours', 2, '視訊免費取消期限：預約前幾小時'),
  -- 資料保存
  ('recording_retention_days', 180, '錄影保存天數，之後自動刪除（有申訴或保固中延長）');
