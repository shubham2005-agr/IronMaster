package com.ragnarok.skill;

public class SkillResult {

    private boolean success;
    private String output;
    private String error;

    public SkillResult() {
    }

    public SkillResult(boolean success, String output, String error) {
        this.success = success;
        this.output = output;
        this.error = error;
    }

    public static SkillResult success(String output) {
        return new SkillResult(true, output, null);
    }

    public static SkillResult failure(String error) {
        return new SkillResult(false, null, error);
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    @Override
    public String toString() {
        return "SkillResult{" +
                "success=" + success +
                ", output='" + output + '\'' +
                ", error='" + error + '\'' +
                '}';
    }
}
