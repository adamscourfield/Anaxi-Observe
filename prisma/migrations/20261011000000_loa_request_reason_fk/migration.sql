-- AddForeignKey: LOARequest.reasonId -> LoaReason.id
ALTER TABLE "LOARequest" ADD CONSTRAINT "LOARequest_reasonId_fkey"
    FOREIGN KEY ("reasonId") REFERENCES "LoaReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
