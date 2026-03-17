-- AddForeignKey: StudentSubjectTeacher.teacherId -> User (via tenantId, teacherId)
ALTER TABLE "StudentSubjectTeacher" ADD CONSTRAINT "StudentSubjectTeacher_teacher_fkey"
    FOREIGN KEY ("tenantId", "teacherId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
